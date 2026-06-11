import { relative, resolve } from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import fs from 'fs-extra'
import sharp from 'sharp'
import { siteOrigin } from '../src/logics/site'

const distDir = resolve('dist')
const expectedImageWidth = 1200
const expectedImageHeight = 630
const maxImageBytes = 5 * 1024 * 1024

function parseAttributes(tag: string) {
  const attributes = new Map<string, string>()
  const attributeRE = /([\w:-]+)\s*=\s*(["'])(.*?)\2/g
  for (const match of tag.matchAll(attributeRE))
    attributes.set(match[1].toLowerCase(), match[3])
  return attributes
}

function findTag(html: string, tagName: string, attribute: string, value: string) {
  const tagRE = new RegExp(`<${tagName}\\b[^>]*>`, 'gi')
  for (const match of html.matchAll(tagRE)) {
    const attributes = parseAttributes(match[0])
    if (attributes.get(attribute) === value)
      return attributes
  }
}

function metaContent(html: string, key: string) {
  return findTag(html, 'meta', 'property', key)?.get('content')
    || findTag(html, 'meta', 'name', key)?.get('content')
}

function pageName(file: string) {
  return relative(distDir, file).replaceAll('\\', '/')
}

async function run() {
  const htmlFiles = await fg('**/*.html', {
    absolute: true,
    cwd: distDir,
    ignore: ['admin/**'],
  })
  const failures: string[] = []
  const localImages = new Map<string, string[]>()

  for (const file of htmlFiles) {
    const page = pageName(file)
    const html = await fs.readFile(file, 'utf-8')
    const title = html.match(/<title>(.*?)<\/title>/i)?.[1]?.trim()
    const htmlTag = html.match(/<html[^>]*>/i)?.[0]
    const htmlLang = htmlTag ? parseAttributes(htmlTag).get('lang') : undefined
    const canonical = findTag(html, 'link', 'rel', 'canonical')?.get('href')
    const description = metaContent(html, 'description')
    const ogImage = metaContent(html, 'og:image')
    const twitterImage = metaContent(html, 'twitter:image')

    const requiredMeta = [
      'og:site_name',
      'og:title',
      'og:description',
      'og:url',
      'og:type',
      'og:image',
      'og:image:type',
      'og:image:width',
      'og:image:height',
      'og:image:alt',
      'twitter:card',
      'twitter:title',
      'twitter:description',
      'twitter:image',
      'twitter:image:alt',
    ]

    if (!title)
      failures.push(`${page}: missing <title>.`)
    if (!htmlLang)
      failures.push(`${page}: missing <html lang>.`)
    if (!canonical)
      failures.push(`${page}: missing canonical link.`)
    if (!description)
      failures.push(`${page}: missing meta description.`)

    for (const key of requiredMeta) {
      if (!metaContent(html, key))
        failures.push(`${page}: missing ${key}.`)
    }

    if (canonical && metaContent(html, 'og:url') !== canonical)
      failures.push(`${page}: og:url does not match canonical.`)
    if (ogImage && twitterImage !== ogImage)
      failures.push(`${page}: twitter:image does not match og:image.`)
    if (metaContent(html, 'og:image:width') !== String(expectedImageWidth))
      failures.push(`${page}: og:image:width must be ${expectedImageWidth}.`)
    if (metaContent(html, 'og:image:height') !== String(expectedImageHeight))
      failures.push(`${page}: og:image:height must be ${expectedImageHeight}.`)

    if (ogImage) {
      const imageUrl = new URL(ogImage, siteOrigin)
      if (imageUrl.origin !== siteOrigin) {
        failures.push(`${page}: OG image must be hosted on ${siteOrigin}.`)
      }
      else {
        const imagePath = resolve(distDir, `.${decodeURIComponent(imageUrl.pathname)}`)
        const pages = localImages.get(imagePath) || []
        pages.push(page)
        localImages.set(imagePath, pages)
      }
    }
  }

  for (const [imagePath, pages] of localImages) {
    const label = `${relative(distDir, imagePath)} (${pages.join(', ')})`
    if (!await fs.pathExists(imagePath)) {
      failures.push(`${label}: referenced OG image does not exist.`)
      continue
    }

    const stat = await fs.stat(imagePath)
    const metadata = await sharp(imagePath).metadata()
    if (metadata.format !== 'png')
      failures.push(`${label}: OG image must be PNG, got ${metadata.format || 'unknown'}.`)
    if (metadata.width !== expectedImageWidth || metadata.height !== expectedImageHeight) {
      failures.push(
        `${label}: OG image must be ${expectedImageWidth}x${expectedImageHeight}, got ${metadata.width}x${metadata.height}.`,
      )
    }
    if (stat.size > maxImageBytes)
      failures.push(`${label}: OG image exceeds 5 MB.`)
  }

  if (failures.length > 0) {
    console.error(`SEO check failed with ${failures.length} error(s):`)
    for (const failure of failures)
      console.error(`- ${failure}`)
    process.exitCode = 1
    return
  }

  console.log(`SEO check passed: ${htmlFiles.length} pages, ${localImages.size} OG image(s).`)
}

run()

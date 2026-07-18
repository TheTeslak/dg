import { relative, resolve } from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import fs from 'fs-extra'
import matter from 'gray-matter'
import sharp from 'sharp'
import { getArticleInfo } from '../build/article'
import { contentSourceDirectory } from '../build/constants'
import { isSupportedLanguageTag, isSupportedLocale, supportedLocales } from '../src/locales/config'
import { getArticlePath } from '../src/logics/article-path'
import { isPostRoutable } from '../src/logics/post-visibility'
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
  return findTags(html, tagName)
    .find(attributes => attributes.get(attribute) === value)
}

function findTags(html: string, tagName: string) {
  const tags: Map<string, string>[] = []
  const tagRE = new RegExp(`<${tagName}\\b[^>]*>`, 'gi')
  for (const match of html.matchAll(tagRE)) {
    const attributes = parseAttributes(match[0])
    tags.push(attributes)
  }
  return tags
}

function metaContent(html: string, key: string) {
  return findTag(html, 'meta', 'property', key)?.get('content')
    || findTag(html, 'meta', 'name', key)?.get('content')
}

function pageName(file: string) {
  return relative(distDir, file).replaceAll('\\', '/')
}

function getExpectedFallbackSource(targetLocale: string, routableLocales: Set<string>) {
  if (routableLocales.has(targetLocale))
    return targetLocale
  if (routableLocales.has('en'))
    return 'en'
  if (routableLocales.size === 1)
    return [...routableLocales][0]
  if (routableLocales.size > 1)
    throw new Error(`Ambiguous fallback for "${targetLocale}": ${[...routableLocales].join(', ')}.`)
}

async function getExpectedFallbackPages() {
  const articles = new Map<string, {
    physical: Set<string>
    routable: Set<string>
  }>()
  const articleFiles = await fg(`pages/*/${fg.escapePath(contentSourceDirectory)}/*.md`)

  for (const file of articleFiles) {
    const contentPage = getArticleInfo(file)
    if (!contentPage || contentPage.slug.startsWith('['))
      continue

    const { sourceLocale: locale, slug } = contentPage
    const state = articles.get(slug) || {
      physical: new Set<string>(),
      routable: new Set<string>(),
    }
    state.physical.add(locale)

    const { data } = matter(await fs.readFile(file, 'utf-8'))
    if (isPostRoutable(data))
      state.routable.add(locale)
    articles.set(slug, state)
  }

  const pages = new Set<string>()
  for (const [slug, state] of articles) {
    for (const targetLocale of supportedLocales) {
      if (state.physical.has(targetLocale))
        continue

      // This intentionally duplicates the contract so a production-helper bug cannot bless itself.
      const sourceLocale = getExpectedFallbackSource(targetLocale, state.routable)
      if (sourceLocale)
        pages.add(`${getArticlePath(targetLocale, slug).slice(1)}.html`)
    }
  }
  return pages
}

function htmlPageForUrl(href: string) {
  const pathname = new URL(href, siteOrigin).pathname.replace(/\/+$/, '')
  return pathname ? `${pathname.slice(1)}.html` : 'index.html'
}

function isCrossLocaleArticleAlias(page: string, canonical: string | undefined) {
  if (!canonical)
    return false

  const pageMatch = page.match(/^([^/]+)\/([^/]+)\.html$/)
  const canonicalMatch = new URL(canonical, siteOrigin).pathname.match(/^\/([^/]+)\/([^/]+)$/)
  if (!pageMatch || !canonicalMatch)
    return false

  const [, pageLocale, pageSlug] = pageMatch
  const [, canonicalLocale, canonicalSlug] = canonicalMatch
  return isSupportedLocale(pageLocale)
    && isSupportedLocale(canonicalLocale)
    && pageLocale !== canonicalLocale
    && pageSlug === canonicalSlug
}

async function run() {
  const htmlFiles = await fg('**/*.html', {
    absolute: true,
    cwd: distDir,
    ignore: ['admin/**'],
  })
  const failures: string[] = []
  const localImages = new Map<string, string[]>()
  const expectedFallbackPages = await getExpectedFallbackPages()
  const generatedPages = new Set(htmlFiles.map(pageName))
  const foundFallbackPages = new Set<string>()

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
    const hreflangLinks = findTags(html, 'link')
      .filter(attributes => attributes.get('rel') === 'alternate' && attributes.has('hreflang'))
    const robots = metaContent(html, 'robots')
    const isNotFoundPage = page === '404.html'

    if (page.includes(':'))
      failures.push(`${page}: dynamic route pattern was emitted as a static page.`)

    if (isNotFoundPage) {
      if (!robots?.split(',').some(value => value.trim() === 'noindex'))
        failures.push(`${page}: custom 404 must be noindex.`)
      if (canonical)
        failures.push(`${page}: custom 404 must not declare a canonical URL.`)
      if (hreflangLinks.length)
        failures.push(`${page}: custom 404 must not declare hreflang links.`)
      continue
    }

    const isFallbackPage = isCrossLocaleArticleAlias(page, canonical)
    if (isFallbackPage && !expectedFallbackPages.has(page))
      failures.push(`${page}: unexpected fallback article was prerendered.`)

    if (expectedFallbackPages.has(page)) {
      if (!isFallbackPage)
        failures.push(`${page}: expected fallback article does not canonicalize to its source.`)
      foundFallbackPages.add(page)
      const publicPath = `/${page.replace(/\.html$/, '')}`
      if (canonical === `${siteOrigin}${publicPath}`)
        failures.push(`${page}: fallback article canonical points to its alias URL.`)
      if (!robots?.split(',').some(value => value.trim() === 'noindex'))
        failures.push(`${page}: fallback article must be noindex.`)
    }

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
      'og:locale',
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
    if (!hreflangLinks.some(attributes => attributes.get('hreflang') === 'x-default'))
      failures.push(`${page}: missing x-default hreflang link.`)

    for (const attributes of hreflangLinks) {
      const hreflang = attributes.get('hreflang') || ''
      const href = attributes.get('href')
      if (hreflang !== 'x-default' && !isSupportedLanguageTag(hreflang))
        failures.push(`${page}: unsupported hreflang "${hreflang}".`)
      if (!href)
        failures.push(`${page}: hreflang "${hreflang}" is missing href.`)
      else if (new URL(href, siteOrigin).origin !== siteOrigin)
        failures.push(`${page}: hreflang "${hreflang}" must point to ${siteOrigin}.`)
      else if (!generatedPages.has(htmlPageForUrl(href)))
        failures.push(`${page}: hreflang "${hreflang}" points to a missing page "${href}".`)
    }

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

  for (const page of expectedFallbackPages) {
    if (!foundFallbackPages.has(page))
      failures.push(`${page}: expected prerendered fallback article is missing.`)
  }

  const sitemapPath = resolve(distDir, 'sitemap.xml')
  if (await fs.pathExists(sitemapPath)) {
    const sitemap = await fs.readFile(sitemapPath, 'utf-8')
    if (sitemap.includes(`<loc>${siteOrigin}/</loc>`))
      failures.push('sitemap.xml: redirect-only root must not be listed as a URL.')
    if (!sitemap.includes(`hreflang="x-default" href="${siteOrigin}/"`))
      failures.push('sitemap.xml: redirect-only root must remain the homepage x-default.')

    for (const page of expectedFallbackPages) {
      const publicPath = `/${page.replace(/\.html$/, '')}`
      if (sitemap.includes(`<loc>${siteOrigin}${publicPath}</loc>`))
        failures.push(`${page}: fallback article must not be listed in sitemap.xml.`)
    }
  }

  const redirectsPath = resolve(distDir, '_redirects')
  if (!await fs.pathExists(resolve(distDir, '404.html')))
    failures.push('404.html: Netlify custom 404 page is missing.')
  if (await fs.pathExists(redirectsPath)) {
    const redirects = await fs.readFile(redirectsPath, 'utf-8')
    if (/^\/\*\s+\/index\.html\s+200!?$/m.test(redirects))
      failures.push('_redirects: SPA fallback would turn missing pages into soft 404s.')
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

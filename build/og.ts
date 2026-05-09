import { Buffer } from 'node:buffer'
import { dirname, extname, resolve } from 'node:path'
import fs from 'fs-extra'
import sharp from 'sharp'
import { getArticleInfo } from './article'
import { supportedLocales, supportedOgSourceExtensions } from './constants'
import { warnFrontmatter } from './frontmatter'

const ogSvg = fs.readFileSync(resolve(__dirname, '../scripts/og-template.svg'), 'utf-8')

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function resolveOgSource(id: string) {
  const article = getArticleInfo(id)
  const bases = article
    ? [
        resolve(__dirname, `../public/og/articles/${article.slug}`),
        ...supportedLocales.map(locale => resolve(__dirname, `../pages/${locale}/articles/${article.slug}`)),
      ]
    : [id.slice(0, -3)]

  const matches: string[] = []
  for (const ext of supportedOgSourceExtensions) {
    for (const base of bases) {
      const candidate = `${base}.${ext}`
      if (fs.existsSync(candidate))
        matches.push(candidate)
    }
  }

  if (matches.length > 1) {
    warnFrontmatter(`[og] ${id}: multiple OG sources found, using ${matches[0]}.`)
  }

  return matches[0]
}

export async function copyOrConvertOg(source: string, output: string) {
  await fs.mkdir(dirname(output), { recursive: true })

  if (resolve(source) === resolve(output))
    return

  if (fs.existsSync(output)) {
    const sourceStat = await fs.stat(source)
    const outputStat = await fs.stat(output)
    if (sourceStat.mtimeMs <= outputStat.mtimeMs)
      return
  }

  const extension = extname(source).toLowerCase()
  if (extension === '.png') {
    await fs.copy(source, output)
    return
  }

  await sharp(source)
    .png()
    .toFile(output)
}

export async function generateOg(title: string, output: string) {
  if (fs.existsSync(output))
    return

  await fs.mkdir(dirname(output), { recursive: true })

  const lines = title.trim().split(/(.{0,30})(?:\s|$)/g).filter(Boolean)

  const data: Record<string, string> = {
    line1: escapeSvgText(lines[0] || ''),
    line2: escapeSvgText(lines[1] || ''),
    line3: escapeSvgText(lines[2] || ''),
  }
  const svg = ogSvg.replace(/\{\{([^}]+)\}\}/g, (_, name) => data[name] || '')

  // eslint-disable-next-line no-console
  console.log(`Generating ${output}`)
  try {
    await sharp(Buffer.from(svg))
      .resize(1200 * 1.1, 630 * 1.1)
      .png()
      .toFile(output)
  }
  catch (e) {
    console.error('Failed to generate og image', e)
  }
}

export async function ensureOgImage(id: string, frontmatter: Record<string, any>, output: string) {
  const source = resolveOgSource(id)
  if (source) {
    await copyOrConvertOg(source, output)
    return
  }

  await generateOg(String(frontmatter.title).replace(/\s-\s.*$/, '').trim(), output)
}

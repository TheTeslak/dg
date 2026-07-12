/**
 * Incrementally maintains generated source lists for articles with
 * `sources: true`. Unchanged articles are skipped by content hash and URL
 * titles are cached in data/sources-cache.json, so prebuild is normally a
 * filesystem-only no-op.
 *
 * Usage:
 *   pnpm sources                         # changed source-enabled articles
 *   pnpm sources -- --refresh           # also refresh URL titles older than 30d
 *   pnpm sources -- path/to/article.md   # one article
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { supportedLocales } from '../src/locales/config.ts'

interface UrlCacheEntry { title?: string; error?: string; status?: number; fetchedAt: string }
interface ArticleCacheEntry { hash: string; urls: string[]; generatedAt: string }
interface SourcesCache { version: 1; urls: Record<string, UrlCacheEntry>; articles: Record<string, ArticleCacheEntry> }
interface Link { url: string; anchor: string }

const root = resolve(import.meta.dirname, '..')
const articlesRoot = resolve(root, 'src/content/articles')
const cachePath = resolve(root, 'data/sources-cache.json')
const refresh = process.argv.includes('--refresh')
const specific = process.argv.slice(2).find(arg => !arg.startsWith('--'))
const maxAge = 30 * 86_400_000

function loadCache(): SourcesCache {
  if (!existsSync(cachePath)) return { version: 1, urls: {}, articles: {} }
  try {
    const parsed = JSON.parse(readFileSync(cachePath, 'utf8'))
    if (parsed?.version === 1) return parsed
  } catch {}
  return { version: 1, urls: {}, articles: {} }
}

function saveCache(cache: SourcesCache) {
  mkdirSync(dirname(cachePath), { recursive: true })
  writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`)
}

function articleFiles() {
  if (specific) {
    const path = resolve(process.cwd(), specific)
    if (!existsSync(path)) throw new Error(`[sources] file not found: ${path}`)
    return [path]
  }
  return supportedLocales.flatMap((locale) => {
    const dir = resolve(articlesRoot, locale)
    if (!existsSync(dir)) return []
    return readdirSync(dir).filter(name => name.endsWith('.md')).map(name => resolve(dir, name))
  }).filter((path) => matter(readFileSync(path, 'utf8')).data.sources === true)
}

function extractLinks(markdown: string): Link[] {
  const body = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  const seen = new Set<string>()
  const links: Link[] = []
  for (const match of body.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
    const url = match[2].replace(/\/+$/, '')
    try {
      const parsed = new URL(url)
      const host = parsed.hostname.replace(/^www\./, '')
      if (host === 'teslak.me' || host === 'localhost' || /\.(?:png|jpe?g|gif|svg|webp|avif|ico)$/i.test(parsed.pathname) || seen.has(url)) continue
    } catch { continue }
    seen.add(url)
    links.push({ url, anchor: match[1].trim() })
  }
  return links
}

function sourcesRange(raw: string) {
  const starts = [...raw.matchAll(/^<!-- sources -->\s*$/gm)]
  const start = starts.at(-1)?.index ?? -1
  if (start < 0) return { start: -1, end: -1, body: raw, block: '' }
  const endMatch = /^<!-- \/sources -->\s*$/gm
  endMatch.lastIndex = start
  const endResult = endMatch.exec(raw)
  const end = endResult ? endResult.index + endResult[0].length : -1
  return { start, end, body: raw.slice(0, start), block: end >= 0 ? raw.slice(start, end) : '' }
}

function seedCacheFromBlock(block: string, cache: SourcesCache) {
  for (const match of block.matchAll(/^- \[([^\]]+)\]\((https?:\/\/[^)]+)\)$/gm)) {
    const [, title, url] = match
    cache.urls[url.replace(/\/+$/, '')] ||= { title: title.replace(/\\([\[\]])/g, '$1'), fetchedAt: new Date(0).toISOString() }
  }
}

function decodeTitle(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/\s+/g, ' ').trim().slice(0, 200)
}

async function fetchTitle(url: string): Promise<UrlCacheEntry> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow', headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'DGSourcesBot/2.0 (+https://teslak.me)' } })
    const contentType = response.headers.get('content-type') || ''
    if (!response.ok || !/html|xhtml/.test(contentType)) return { status: response.status, error: response.ok ? `non-HTML: ${contentType}` : `HTTP ${response.status}`, fetchedAt: new Date().toISOString() }
    const html = (await response.text()).slice(0, 65_536)
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    return match ? { status: response.status, title: decodeTitle(match[1]), fetchedAt: new Date().toISOString() } : { status: response.status, error: 'title not found', fetchedAt: new Date().toISOString() }
  } catch (error: any) {
    return { error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error), fetchedAt: new Date().toISOString() }
  } finally { clearTimeout(timer) }
}

function sourceBlock(links: Link[], cache: SourcesCache) {
  const lines = ['<!-- sources -->']
  for (const link of links) {
    const entry = cache.urls[link.url]
    const domain = new URL(link.url).hostname.replace(/^www\./, '')
    const title = (entry?.title || link.anchor || domain).replace(/\[/g, '\\[').replace(/\]/g, '\\]')
    lines.push(`- [${title}](${link.url})`)
  }
  lines.push('<!-- /sources -->')
  return lines.join('\n')
}

async function main() {
  const cache = loadCache()
  let changed = 0
  let fetched = 0
  let skipped = 0
  for (const path of articleFiles()) {
    const raw = readFileSync(path, 'utf8')
    const parsed = matter(raw)
    if (parsed.data.sources !== true && !specific) continue
    const range = sourcesRange(raw)
    const beforeSources = range.body.trimEnd()
    const hash = createHash('sha256').update(beforeSources).digest('hex')
    const key = relative(root, path).replaceAll('\\', '/')
    if (!refresh && cache.articles[key]?.hash === hash && raw.includes('<!-- /sources -->')) { skipped++; continue }
    seedCacheFromBlock(range.block, cache)
    const bodyWithoutFrontmatter = matter(beforeSources).content
    const links = extractLinks(bodyWithoutFrontmatter)
    for (const link of links) {
      const cached = cache.urls[link.url]
      const stale = !cached || Date.now() - Date.parse(cached.fetchedAt) > maxAge
      if (!cached || (refresh && stale)) { cache.urls[link.url] = await fetchTitle(link.url); fetched++ }
    }
    const block = sourceBlock(links, cache)
    const next = range.start >= 0 && range.end >= range.start
      ? `${raw.slice(0, range.start)}${block}${raw.slice(range.end)}`
      : `${raw.trimEnd()}\n\n${block}\n`
    if (next !== raw) { writeFileSync(path, next); changed++ }
    cache.articles[key] = { hash, urls: links.map(link => link.url), generatedAt: new Date().toISOString() }
    saveCache(cache)
  }
  saveCache(cache)
  console.log(`[sources] ${changed} article(s) updated, ${fetched} title(s) fetched, ${skipped} unchanged article(s) skipped.`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 })

/**
 * resolve-sources.ts
 * Scans articles, fetches page titles, and generates <!-- sources --> blocks.
 *
 * Usage:
 *   pnpm tsx scripts/resolve-sources.ts                     # all
 *   pnpm tsx scripts/resolve-sources.ts path/to/article.md  # specific
 */

import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import process from 'node:process'
import fs from 'fs-extra'
import matter from 'gray-matter'

// ── Configuration ──

const PROJECT_ROOT = resolve(import.meta.dirname, '..')
const CACHE_PATH = resolve(PROJECT_ROOT, 'data/sources-cache.json')
const PAGES_DIR = resolve(PROJECT_ROOT, 'pages')
const SUPPORTED_LOCALES = ['en', 'ru', 'es']

const REQUEST_DELAY_MS = 1200 // Rate limit delay
const REQUEST_TIMEOUT_MS = 10_000 // HTTP timeout
const CACHE_MAX_AGE_DAYS = 30 // TTL

// ── Types ──

interface CacheEntry {
  title: string | null
  status: number | null
  fetchedAt: string
  error?: string
}

type SourcesCache = Record<string, CacheEntry>

interface ExtractedLink {
  url: string
  anchorText: string
}

// ── Helpers ──

const dim = (s: string) => `\x1B[2m${s}\x1B[0m`
const green = (s: string) => `\x1B[32m${s}\x1B[0m`
const yellow = (s: string) => `\x1B[33m${s}\x1B[0m`
const red = (s: string) => `\x1B[31m${s}\x1B[0m`
const cyan = (s: string) => `\x1B[36m${s}\x1B[0m`

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return url
  }
}

function isCacheValid(entry: CacheEntry): boolean {
  const age = Date.now() - new Date(entry.fetchedAt).getTime()
  return age < CACHE_MAX_AGE_DAYS * 86_400_000
}

// ── Link extraction ──

/** Extract ordered, deduplicated external links. */
function extractLinks(content: string): ExtractedLink[] {
  // Isolate body
  const bodyEnd = content.indexOf('<!-- sources -->')
  const body = bodyEnd !== -1 ? content.slice(0, bodyEnd) : content

  // Exclude code blocks
  const noCode = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')

  // Exclude images
  const noImages = noCode.replace(/!\[[^\]]*\]\([^)]*\)/g, '')

  // Match links
  const linkRegex = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g
  const seen = new Set<string>()
  const links: ExtractedLink[] = []

  const internalDomains = ['antfu.me', 'www.antfu.me', 'teslak.com', 'www.teslak.com', 'localhost']
  const imageExtensions = /\.(?:png|jpe?g|gif|svg|webp|avif|ico|bmp|tiff?)(?:\?.*)?$/i

  let match
  // eslint-disable-next-line no-cond-assign
  while ((match = linkRegex.exec(noImages)) !== null) {
    const [, anchorText, url] = match

    // Filter assets & internal links
    try {
      const parsed = new URL(url)

      const hostname = parsed.hostname.replace(/^www\./, '')
      if (internalDomains.some(d => d.replace(/^www\./, '') === hostname))
        continue

      if (imageExtensions.test(parsed.pathname))
        continue
    }
    catch {
      continue // malformed URL
    }

    // Normalize and dedup
    const normalized = url.replace(/\/+$/, '')
    if (seen.has(normalized))
      continue
    seen.add(normalized)
    links.push({ url, anchorText: anchorText.trim() })
  }

  return links
}

// ── Title fetching ──

/** Fetch <title> with timeout and redirect handling. */
async function fetchTitle(url: string): Promise<CacheEntry> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // Polite identification + avoid bot blocks
        'User-Agent': 'Mozilla/5.0 (compatible; DGSourcesBot/1.0; +https://teslak.com)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
      },
    })

    clearTimeout(timeout)

    // Handle HTTP errors
    if (response.status === 404 || response.status === 410) {
      return {
        title: null,
        status: response.status,
        fetchedAt: new Date().toISOString(),
        error: response.status === 404 ? 'Page not found' : 'Page gone',
      }
    }

    if (response.status === 429) {
      return {
        title: null,
        status: 429,
        fetchedAt: new Date().toISOString(),
        error: 'Rate limited by server',
      }
    }

    if (!response.ok) {
      return {
        title: null,
        status: response.status,
        fetchedAt: new Date().toISOString(),
        error: `HTTP ${response.status}`,
      }
    }

    // Check content type
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
      return {
        title: null,
        status: response.status,
        fetchedAt: new Date().toISOString(),
        error: `Non-HTML response: ${contentType.split(';')[0]}`,
      }
    }

    // Read chunked body limit
    const reader = response.body?.getReader()
    if (!reader) {
      return {
        title: null,
        status: response.status,
        fetchedAt: new Date().toISOString(),
        error: 'No response body',
      }
    }

    let html = ''
    const decoder = new TextDecoder('utf-8', { fatal: false })
    const maxBytes = 32 * 1024

    while (html.length < maxBytes) {
      const { done, value } = await reader.read()
      if (done)
        break
      html += decoder.decode(value, { stream: true })
      // Early exit
      if (html.includes('</title>'))
        break
    }
    reader.cancel()

    // Parse <title>
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (!titleMatch || !titleMatch[1].trim()) {
      return {
        title: null,
        status: response.status,
        fetchedAt: new Date().toISOString(),
        error: 'No title tag found',
      }
    }

    // Decode HTML entities
    let title = titleMatch[1]
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number.parseInt(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(Number.parseInt(n, 16)))
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, '\'')
      .replace(/\s+/g, ' ')
      .trim()

    // Truncate
    if (title.length > 200)
      title = `${title.slice(0, 197)}…`

    return {
      title,
      status: response.status,
      fetchedAt: new Date().toISOString(),
    }
  }
  catch (err: any) {
    clearTimeout(timeout)

    if (err.name === 'AbortError') {
      return {
        title: null,
        status: null,
        fetchedAt: new Date().toISOString(),
        error: `Timeout after ${REQUEST_TIMEOUT_MS / 1000}s`,
      }
    }

    // Network errors
    const message = err.cause?.code || err.code || err.message || 'Unknown error'
    return {
      title: null,
      status: null,
      fetchedAt: new Date().toISOString(),
      error: `Connection failed: ${message}`,
    }
  }
}

// ── Cache ──

function loadCache(): SourcesCache {
  try {
    if (fs.existsSync(CACHE_PATH))
      return fs.readJsonSync(CACHE_PATH)
  }
  catch {
    console.warn(yellow('⚠ Could not parse sources cache, starting fresh.'))
  }
  return {}
}

function saveCache(cache: SourcesCache): void {
  fs.ensureDirSync(resolve(CACHE_PATH, '..'))
  fs.writeJsonSync(CACHE_PATH, cache, { spaces: 2 })
}

// ── Sources block generation ──

function generateSourcesBlock(links: ExtractedLink[], cache: SourcesCache): string {
  const lines: string[] = ['<!-- sources -->']

  for (const link of links) {
    const entry = cache[link.url]
    let title: string

    if (entry?.title) {
      title = entry.title
    }
    else if (entry?.error) {
      // Fallback placeholder
      const domain = domainOf(link.url)
      if (entry.status === 404 || entry.status === 410)
        title = `⚠ ${domain} — page not found`
      else if (entry.status === 429)
        title = `⚠ ${domain} — rate limited, retry later`
      else
        title = `⚠ ${domain} — title unavailable`
    }
    else {
      // Uncached fallback
      title = `⚠ ${domainOf(link.url)}`
    }

    // Escape brackets
    const safeTitle = title.replace(/\[/g, '\\[').replace(/\]/g, '\\]')
    lines.push(`- [${safeTitle}](${link.url})`)
  }

  lines.push('<!-- /sources -->')
  return lines.join('\n')
}

// ── Article processing ──

function findArticles(specificPath?: string): string[] {
  if (specificPath) {
    const resolved = resolve(process.cwd(), specificPath)
    if (!fs.existsSync(resolved)) {
      console.error(red(`✗ File not found: ${resolved}`))
      process.exit(1)
    }
    return [resolved]
  }

  // Scan enabled articles
  const articles: string[] = []
  for (const locale of SUPPORTED_LOCALES) {
    const dir = resolve(PAGES_DIR, locale, 'articles')
    if (!fs.existsSync(dir))
      continue
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md') || file.startsWith('['))
        continue
      const fullPath = resolve(dir, file)
      const { data } = matter(fs.readFileSync(fullPath, 'utf-8'))
      if (data.sources)
        articles.push(fullPath)
    }
  }

  return articles
}

async function processArticle(filePath: string, cache: SourcesCache): Promise<{ fetched: number, cached: number, errors: number }> {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data: _frontmatter, content } = matter(raw)

  const links = extractLinks(content)
  if (links.length === 0) {
    console.log(dim(`  No external links found, skipping.`))
    return { fetched: 0, cached: 0, errors: 0 }
  }

  console.log(`  Found ${cyan(String(links.length))} unique external links`)

  let fetched = 0
  let cached = 0
  let errors = 0

  // Fetch missing titles
  for (let i = 0; i < links.length; i++) {
    const link = links[i]
    const existing = cache[link.url]

    if (existing && isCacheValid(existing)) {
      cached++
      const status = existing.title
        ? dim(`  ✓ [cached] ${existing.title}`)
        : dim(`  ✓ [cached] ${link.url} (${existing.error})`)
      console.log(status)
      continue
    }

    // Rate limit
    if (fetched > 0)
      await sleep(REQUEST_DELAY_MS)

    const domain = domainOf(link.url)
    process.stdout.write(`  ⏳ Fetching ${dim(domain)}… `)

    const start = performance.now()
    const entry = await fetchTitle(link.url)
    const elapsed = Math.round(performance.now() - start)

    cache[link.url] = entry

    if (entry.title) {
      console.log(`${green('✓')} ${entry.title} ${dim(`(${elapsed}ms)`)}`)
      fetched++
    }
    else {
      console.log(`${red('✗')} ${entry.error} ${dim(`(${elapsed}ms)`)}`)
      errors++
      fetched++
    }

    // Backoff on 429
    if (entry.status === 429) {
      console.log(yellow(`  ⏸ Rate limited, waiting 5s…`))
      await sleep(5000)
    }
  }

  // Generate the sources block
  const sourcesBlock = generateSourcesBlock(links, cache)

  // Update or insert the sources block in the file
  const sourcesStart = raw.indexOf('<!-- sources -->')
  const sourcesEnd = raw.indexOf('<!-- /sources -->')

  let updatedContent: string
  if (sourcesStart !== -1 && sourcesEnd !== -1) {
    // Update existing
    const endMarker = '<!-- /sources -->'
    const blockEnd = sourcesEnd + endMarker.length
    updatedContent = raw.slice(0, sourcesStart) + sourcesBlock + raw.slice(blockEnd)
  }
  else {
    // Append to EOF
    const trimmed = raw.trimEnd()
    updatedContent = `${trimmed}\n\n${sourcesBlock}\n`
  }

  fs.writeFileSync(filePath, updatedContent, 'utf-8')

  return { fetched, cached, errors }
}

// ── Main ──

async function main() {
  const specificFile = process.argv[2]
  const articles = findArticles(specificFile)

  if (articles.length === 0) {
    console.log(yellow('No articles with sources: true found.'))
    if (!specificFile)
      console.log(dim('Tip: add "sources: true" to an article\'s frontmatter, or pass a file path.'))
    return
  }

  console.log(`\n📚 Resolving sources for ${cyan(String(articles.length))} article${articles.length > 1 ? 's' : ''}…\n`)

  const cache = loadCache()
  let totalFetched = 0
  let totalCached = 0
  let totalErrors = 0

  for (const article of articles) {
    const relative = article.replace(PROJECT_ROOT, '').replace(/^[/\\]/, '')
    console.log(`\n${green('→')} ${relative}`)

    const { fetched, cached: cachedCount, errors } = await processArticle(article, cache)
    totalFetched += fetched
    totalCached += cachedCount
    totalErrors += errors

    // Save cache after each article (in case of interruption)
    saveCache(cache)
  }

  // Summary
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`  ${green('✓')} Done.  Fetched: ${totalFetched}  Cached: ${totalCached}  Errors: ${totalErrors}`)
  if (totalErrors > 0)
    console.log(`  ${yellow('⚠')} ${totalErrors} link${totalErrors > 1 ? 's' : ''} could not be resolved. Look for ⚠ placeholders in the sources block.`)
  console.log()
}

main().catch((err) => {
  console.error(red('Fatal error:'), err)
  process.exit(1)
})

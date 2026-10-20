import type { PostVisibilityFrontmatter } from '../src/logics/post-visibility.ts'
import type { SupportedLocale } from './constants.ts'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'
import fs from 'fs-extra'
import matter from 'gray-matter'
import { defaultLocale, getLanguageTag, localeSegmentPattern } from '../src/locales/config.ts'
import { getArticlePath } from '../src/logics/article-path.ts'
import { hasNoindexRobots, isDraftPost, isPostIndexable } from '../src/logics/post-visibility.ts'
import { getArticleInfo } from './article.ts'
import { supportedLocales } from './constants.ts'

interface SeoFrontmatter extends PostVisibilityFrontmatter {
  updated?: string | Date
  open?: boolean
}

interface SitemapEntry {
  path: string
  groupKey: string
  locale?: SupportedLocale
  isArticle?: boolean
  lastmod: string
}

interface SitemapCollectResult {
  entries: SitemapEntry[]
  trainingAllowedPaths: string[]
  trainingBlockedPaths: string[]
}

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(currentDir, '..')
const pagesDir = resolve(repoRoot, 'pages')

const localePrefixRE = new RegExp(`^/(${localeSegmentPattern})(/.*)?$`)

function slash(path: string) {
  return path.replace(/\\/g, '/')
}

function escapeXml(value: string) {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\v\f\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function absoluteUrl(siteOrigin: string, path: string) {
  return new URL(path, siteOrigin).toString()
}

function toIsoDate(value: unknown): string | undefined {
  if (value == null)
    return undefined
  if (typeof value !== 'string' && !(value instanceof Date))
    return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function getFileLastmod(file: string, frontmatter: SeoFrontmatter) {
  return toIsoDate(frontmatter.updated)
    || toIsoDate(frontmatter.date)
    || fs.statSync(file).mtime.toISOString()
}

function getLocalizedRoute(path: string) {
  const match = path.match(localePrefixRE)
  if (!match)
    return undefined
  return {
    locale: match[1] as SupportedLocale,
    rest: match[2] || '/',
  }
}

function getGroupKey(path: string) {
  if (path === '/')
    return '/'
  return getLocalizedRoute(path)?.rest || path
}

function getPageRoute(file: string) {
  const ext = file.endsWith('.md') ? '.md' : '.vue'

  if (ext === '.md') {
    const article = getArticleInfo(file)
    if (article && article.slug !== 'index' && !article.slug.startsWith('['))
      return getArticlePath(article.sourceLocale, article.slug)
  }

  let route = slash(relative(pagesDir, file)).replace(new RegExp(`\\${ext}$`), '')
  if (route.includes('['))
    return undefined
  if (route === 'index')
    return '/'
  if (route.endsWith('/index'))
    route = route.slice(0, -'/index'.length)
  return `/${route}`
}

function isRouteIndexable(frontmatter: SeoFrontmatter, isArticle: boolean) {
  if (!isArticle) {
    // Non-article pages: filter by explicit draft or noindex
    if (frontmatter.draft || isDraftPost(frontmatter.type))
      return false
    if (hasNoindexRobots(frontmatter.robots))
      return false
    return true
  }

  return isPostIndexable(frontmatter)
}

async function collectSitemapEntries(): Promise<SitemapCollectResult> {
  const entries: SitemapEntry[] = []
  const trainingAllowedPaths: string[] = []
  const trainingBlockedPaths: string[] = []

  const files = await fg('**/*.{md,vue}', {
    cwd: pagesDir,
    absolute: true,
    onlyFiles: true,
    ignore: ['**/AGENTS.md'],
  })

  for (const file of files) {
    const path = getPageRoute(file)
    if (!path)
      continue
    if (path === '/')
      continue

    const article = getArticleInfo(file)
    const isArticle = !!article && article.slug !== 'index' && !article.slug.startsWith('[')

    const ext = file.endsWith('.vue') ? 'vue' : 'md'
    let data: SeoFrontmatter = {}

    if (ext === 'md') {
      const parsed = matter(await fs.readFile(file, 'utf-8'))
      data = parsed.data as SeoFrontmatter
    }

    if (!isRouteIndexable(data, isArticle))
      continue

    if (data.open)
      trainingAllowedPaths.push(path)
    if (isArticle)
      trainingBlockedPaths.push(path)

    const localized = getLocalizedRoute(path)
    entries.push({
      path,
      groupKey: getGroupKey(path),
      locale: localized?.locale,
      isArticle,
      lastmod: getFileLastmod(file, data),
    })
  }

  return {
    entries: entries.sort((a, b) => a.path.localeCompare(b.path)),
    trainingAllowedPaths: trainingAllowedPaths.sort(),
    trainingBlockedPaths: trainingBlockedPaths.sort(),
  }
}

function buildAlternateLinks(entry: SitemapEntry, groups: Map<string, SitemapEntry[]>, siteOrigin: string) {
  // hreflang describes real indexable translations, never convenience alias URLs.
  const group = groups.get(entry.groupKey) || []
  const localizedEntries = group
    .filter((item): item is SitemapEntry & { locale: SupportedLocale } => !!item.locale)
    .sort((a, b) => supportedLocales.indexOf(a.locale) - supportedLocales.indexOf(b.locale))

  const links: { hreflang: string, href: string }[] = localizedEntries.map(item => ({
    hreflang: getLanguageTag(item.locale),
    href: absoluteUrl(siteOrigin, item.path),
  }))

  const xDefaultPath = entry.groupKey === '/'
    ? '/'
    : (
        group.find(item => item.path === '/')?.path
        || localizedEntries.find(item => item.locale === defaultLocale)?.path
        || localizedEntries[0]?.path
      )

  if (xDefaultPath) {
    links.push({
      hreflang: 'x-default',
      href: absoluteUrl(siteOrigin, xDefaultPath),
    })
  }

  return links
}

function getUrlMeta(entry: SitemapEntry) {
  const { path } = entry
  if (path === '/')
    return { changefreq: 'weekly', priority: '1.0' }
  if (entry.isArticle)
    return { changefreq: 'monthly', priority: '0.7' }
  return { changefreq: 'monthly', priority: '0.5' }
}

function buildSitemapXml(entries: SitemapEntry[], siteOrigin: string) {
  const groups = new Map<string, SitemapEntry[]>()
  for (const entry of entries) {
    const group = groups.get(entry.groupKey) || []
    group.push(entry)
    groups.set(entry.groupKey, group)
  }

  const urls = entries.map((entry) => {
    const alternates = buildAlternateLinks(entry, groups, siteOrigin)
    const alternateXml = alternates
      .map(link => `    <xhtml:link rel="alternate" hreflang="${escapeXml(link.hreflang)}" href="${escapeXml(link.href)}" />`)
      .join('\n')

    const meta = getUrlMeta(entry)

    return [
      '  <url>',
      `    <loc>${escapeXml(absoluteUrl(siteOrigin, entry.path))}</loc>`,
      `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`,
      `    <changefreq>${meta.changefreq}</changefreq>`,
      `    <priority>${meta.priority}</priority>`,
      alternateXml,
      '  </url>',
    ].filter(line => line.trim().length > 0).join('\n')
  }).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urls,
    '</urlset>',
    '',
  ].join('\n')
}

function buildRobotsTxt(siteOrigin: string, allowedArticles: string[], blockedArticles: string[]) {
  // Content paths that training/scraping crawlers should not access
  const contentSections = ['articles', 'notes', 'photos', 'now']
  const sectionPaths = supportedLocales.flatMap(
    locale => contentSections.map(section => `/${locale}/${section}`),
  )
  const contentPaths = [...sectionPaths, ...blockedArticles]

  // Training & scraping crawlers — blocked from blog content only
  const trainingBots = [
    'GPTBot',
    'Google-Extended',
    'ClaudeBot',
    'Applebot-Extended',
    'CCBot',
    'meta-externalagent',
    'Amazonbot',
    'Bytespider',
    'FacebookBot',
  ]

  // Search & answer-engine crawlers — full access
  const searchBots = [
    'Googlebot',
    'Bingbot',
    'YandexBot',
    'DuckDuckBot',
    'Slurp',
    'Applebot',
  ]
  const answerBots = [
    'OAI-SearchBot',
    'ChatGPT-User',
    'Claude-SearchBot',
    'Claude-User',
    'PerplexityBot',
    'Perplexity-User',
    'Amzn-SearchBot',
    'Amzn-User',
    'DuckAssistBot',
    'MistralAI-User',
    'Meta-WebIndexer',
    'meta-externalfetcher',
  ]

  // Social & messaging preview bots — full access
  const socialBots = [
    'facebookexternalhit',
    'Twitterbot',
    'LinkedInBot',
    'TelegramBot',
    'WhatsApp',
    'SkypeUriPreview',
  ]

  function trainingGroup(userAgent: string) {
    return [
      `User-agent: ${userAgent}`,
      ...allowedArticles.map(path => `Allow: ${path}`),
      ...contentPaths.map(path => `Disallow: ${path}`),
    ].join('\n')
  }

  function allowGroup(userAgent: string) {
    return [
      `User-agent: ${userAgent}`,
      'Allow: /',
    ].join('\n')
  }

  return [
    ...trainingBots.map(trainingGroup),
    ...searchBots.map(allowGroup),
    ...answerBots.map(allowGroup),
    ...socialBots.map(allowGroup),
    // Block all unknown crawlers by default, except the homepage and allowed articles
    [
      'User-agent: *',
      'Allow: /$',
      ...allowedArticles.map(path => `Allow: ${path}`),
      'Disallow: /',
    ].join('\n'),
    `Sitemap: ${absoluteUrl(siteOrigin, '/sitemap.xml')}`,
    '# I\'m fond of robots; after all, I too am one.',
    '',
  ].join('\n\n')
}

export async function generateSeoFiles(options: { outDir?: string, siteOrigin: string }) {
  const outDir = resolve(repoRoot, options.outDir || 'dist')
  const { entries, trainingAllowedPaths, trainingBlockedPaths } = await collectSitemapEntries()

  await fs.ensureDir(outDir)
  await fs.writeFile(resolve(outDir, 'sitemap.xml'), buildSitemapXml(entries, options.siteOrigin), 'utf-8')
  await fs.writeFile(resolve(outDir, 'robots.txt'), buildRobotsTxt(options.siteOrigin, trainingAllowedPaths, trainingBlockedPaths), 'utf-8')
}

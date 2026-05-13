import type { SupportedLocale } from './constants'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'
import fs from 'fs-extra'
import matter from 'gray-matter'
import { hasNoindexRobots, isDraftPost, isPostIndexable } from '../src/logics/post-visibility'
import { supportedLocales } from './constants'

interface SitemapEntry {
  path: string
  groupKey: string
  locale?: SupportedLocale
  lastmod: string
}

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(currentDir, '..')
const pagesDir = resolve(repoRoot, 'pages')

const localePrefixRE = /^\/(en|ru|es)(\/.*)?$/
const articleRouteRE = /^\/(en|ru|es)\/articles\/([^/]+)$/

function slash(path: string) {
  return path.replace(/\\/g, '/')
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function absoluteUrl(siteOrigin: string, path: string) {
  return new URL(path, siteOrigin).toString()
}

function toIsoDate(value: unknown) {
  if (!value)
    return undefined
  const date = new Date(value as string | Date)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function getFileLastmod(file: string, frontmatter: Record<string, any>) {
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

function getMarkdownRoute(file: string) {
  let route = slash(relative(pagesDir, file)).replace(/\.md$/, '')
  if (route.includes('['))
    return undefined
  if (route === 'index')
    return '/'
  if (route.endsWith('/index'))
    route = route.slice(0, -'/index'.length)
  return `/${route}`
}

function isRouteIndexable(path: string, frontmatter: Record<string, any>) {
  if (frontmatter.draft || isDraftPost(frontmatter.type))
    return false

  if (hasNoindexRobots(frontmatter.robots))
    return false

  const article = path.match(articleRouteRE)
  if (!article)
    return true

  const slug = article[2]
  if (slug === 'index')
    return true

  return isPostIndexable(frontmatter)
}

async function collectSitemapEntries() {
  const entries: SitemapEntry[] = []

  const rootFile = resolve(pagesDir, 'index.vue')
  if (fs.existsSync(rootFile)) {
    entries.push({
      path: '/',
      groupKey: '/',
      lastmod: fs.statSync(rootFile).mtime.toISOString(),
    })
  }

  const files = await fg('**/*.md', {
    cwd: pagesDir,
    absolute: true,
    onlyFiles: true,
  })

  for (const file of files) {
    const path = getMarkdownRoute(file)
    if (!path)
      continue

    const { data } = matter(await fs.readFile(file, 'utf-8'))
    if (!isRouteIndexable(path, data))
      continue

    const localized = getLocalizedRoute(path)
    entries.push({
      path,
      groupKey: getGroupKey(path),
      locale: localized?.locale,
      lastmod: getFileLastmod(file, data),
    })
  }

  return entries.sort((a, b) => a.path.localeCompare(b.path))
}

function buildAlternateLinks(entry: SitemapEntry, groups: Map<string, SitemapEntry[]>, siteOrigin: string) {
  const group = groups.get(entry.groupKey) || []
  const localizedEntries = group
    .filter((item): item is SitemapEntry & { locale: SupportedLocale } => !!item.locale)
    .sort((a, b) => supportedLocales.indexOf(a.locale) - supportedLocales.indexOf(b.locale))

  const links: { hreflang: string, href: string }[] = localizedEntries.map(item => ({
    hreflang: item.locale,
    href: absoluteUrl(siteOrigin, item.path),
  }))

  const xDefault = group.find(item => item.path === '/')
    || localizedEntries.find(item => item.locale === 'en')
    || localizedEntries[0]

  if (xDefault) {
    links.push({
      hreflang: 'x-default',
      href: absoluteUrl(siteOrigin, xDefault.path),
    })
  }

  return links
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

    return [
      '  <url>',
      `    <loc>${escapeXml(absoluteUrl(siteOrigin, entry.path))}</loc>`,
      `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`,
      alternateXml,
      '  </url>',
    ].filter(Boolean).join('\n')
  }).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urls,
    '</urlset>',
    '',
  ].join('\n')
}

function buildRobotsTxt(siteOrigin: string) {
  // Content paths that training/scraping crawlers should not access
  const blogPaths = [
    '/en/articles/',
    '/ru/articles/',
    '/es/articles/',
    '/en/notes',
    '/ru/notes',
    '/es/notes',
    '/en/photos',
    '/ru/photos',
    '/es/photos',
    '/en/now',
    '/ru/now',
    '/es/now',
  ]

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
      ...blogPaths.map(path => `Disallow: ${path}`),
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
    // Block all unknown crawlers by default
    'User-agent: *\nDisallow: /',
    `Sitemap: ${absoluteUrl(siteOrigin, '/sitemap.xml')}`,
    '# I\'m fond of robots; after all, I too am one.',
    '',
  ].join('\n\n')
}

export async function generateSeoFiles(options: { outDir?: string, siteOrigin: string }) {
  const outDir = resolve(repoRoot, options.outDir || 'dist')
  const entries = await collectSitemapEntries()

  await fs.ensureDir(outDir)
  await fs.writeFile(resolve(outDir, 'sitemap.xml'), buildSitemapXml(entries, options.siteOrigin), 'utf-8')
  await fs.writeFile(resolve(outDir, 'robots.txt'), buildRobotsTxt(options.siteOrigin), 'utf-8')
}

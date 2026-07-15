/**
 * Sitemap + robots.txt generation, ported from dg `build/seo.ts`:
 * - hreflang alternates describe real indexable translations, never
 *   convenience alias URLs;
 * - drafts / noindex posts are excluded;
 * - robots.txt keeps the explicit crawler policy (training bots blocked from
 *   blog content, search/answer/social bots allowed, unknown bots blocked).
 */
import { resolve } from 'node:path'
import fs from 'fs-extra'
import type { SupportedLocale } from '../src/locales/config.ts'
import { defaultLocale, getLanguageTag, supportedLocales } from '../src/locales/config.ts'
import { isPostIndexable } from '../src/utils/post-visibility.ts'
import { loadArticleFiles } from './lib/articles.ts'

const SITE_ORIGIN = 'https://teslak.me'

interface SitemapEntry {
  path: string
  groupKey: string
  locale?: SupportedLocale
  isArticle: boolean
  lastmod: string
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function absoluteUrl(path: string) {
  return new URL(path, SITE_ORIGIN).toString()
}

function toIsoDate(value: unknown): string | undefined {
  if (!value)
    return undefined
  if (typeof value !== 'string' && !(value instanceof Date))
    return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

const STATIC_SECTIONS = ['', '/articles', '/notes', '/now', '/photos', '/projects', '/finds']

async function collectEntries() {
  const entries: SitemapEntry[] = []
  const trainingAllowedPaths: string[] = []
  const trainingBlockedPaths: string[] = []

  for (const locale of supportedLocales) {
    for (const section of STATIC_SECTIONS) {
      const pageName = section ? section.slice(1) : 'home'
      const pageFile = resolve(`src/content/pages/${locale}/${pageName}.md`)
      entries.push({
        path: `/${locale}${section}`,
        groupKey: section || '/home',
        locale,
        isArticle: false,
        lastmod: fs.statSync(pageFile).mtime.toISOString(),
      })
    }
  }

  const articles = await loadArticleFiles()
  for (const article of articles) {
    if (!isPostIndexable(article.data))
      continue

    if (article.data.open)
      trainingAllowedPaths.push(article.path)
    trainingBlockedPaths.push(article.path)

    entries.push({
      path: article.path,
      groupKey: `/${article.slug}`,
      locale: article.locale,
      isArticle: true,
      lastmod: toIsoDate(article.data.updated)
        || toIsoDate(article.data.date)
        || fs.statSync(article.file).mtime.toISOString(),
    })
  }

  return {
    entries: entries.sort((a, b) => a.path.localeCompare(b.path)),
    trainingAllowedPaths: trainingAllowedPaths.sort(),
    trainingBlockedPaths: trainingBlockedPaths.sort(),
  }
}

function buildAlternateLinks(entry: SitemapEntry, groups: Map<string, SitemapEntry[]>) {
  // hreflang describes real indexable translations, never convenience alias URLs.
  const group = groups.get(entry.groupKey) || []
  const localizedEntries = group
    .filter((item): item is SitemapEntry & { locale: SupportedLocale } => !!item.locale)
    .sort((a, b) => supportedLocales.indexOf(a.locale) - supportedLocales.indexOf(b.locale))

  const links: { hreflang: string, href: string }[] = localizedEntries.map(item => ({
    hreflang: getLanguageTag(item.locale),
    href: absoluteUrl(item.path),
  }))

  const xDefaultPath = localizedEntries.find(item => item.locale === defaultLocale)?.path
    || localizedEntries[0]?.path

  if (xDefaultPath) {
    links.push({
      hreflang: 'x-default',
      href: absoluteUrl(xDefaultPath),
    })
  }

  return links
}

function getUrlMeta(entry: SitemapEntry) {
  if (entry.groupKey === '/home')
    return { changefreq: 'weekly', priority: '1.0' }
  if (entry.isArticle)
    return { changefreq: 'monthly', priority: '0.7' }
  return { changefreq: 'monthly', priority: '0.5' }
}

function buildSitemapXml(entries: SitemapEntry[]) {
  const groups = new Map<string, SitemapEntry[]>()
  for (const entry of entries) {
    const group = groups.get(entry.groupKey) || []
    group.push(entry)
    groups.set(entry.groupKey, group)
  }

  const urls = entries.map((entry) => {
    const alternateXml = buildAlternateLinks(entry, groups)
      .map(link => `    <xhtml:link rel="alternate" hreflang="${escapeXml(link.hreflang)}" href="${escapeXml(link.href)}" />`)
      .join('\n')
    const meta = getUrlMeta(entry)

    return [
      '  <url>',
      `    <loc>${escapeXml(absoluteUrl(entry.path))}</loc>`,
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

function buildRobotsTxt(allowedArticles: string[], blockedArticles: string[]) {
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
  const searchBots = ['Googlebot', 'Bingbot', 'YandexBot', 'DuckDuckBot', 'Slurp', 'Applebot']
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
    return [`User-agent: ${userAgent}`, 'Allow: /'].join('\n')
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
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    '# I\'m fond of robots; after all, I too am one.',
    '',
  ].join('\n\n')
}

async function run() {
  const outDir = resolve('dist')
  const { entries, trainingAllowedPaths, trainingBlockedPaths } = await collectEntries()

  if (!entries.some(entry => entry.isArticle)) {
    console.error('[SEO] No indexable articles found — refusing to write the sitemap. Is src/content/articles populated?')
    process.exit(1)
  }

  await fs.ensureDir(outDir)
  await fs.writeFile(resolve(outDir, 'sitemap.xml'), buildSitemapXml(entries), 'utf-8')
  await fs.writeFile(resolve(outDir, 'robots.txt'), buildRobotsTxt(trainingAllowedPaths, trainingBlockedPaths), 'utf-8')
  console.log(`[SEO] sitemap.xml (${entries.length} urls) + robots.txt → dist/`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

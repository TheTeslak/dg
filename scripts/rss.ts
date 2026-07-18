/**
 * Full-content RSS / Atom / JSON Feed generation, ported from dg
 * `scripts/rss.ts`: real rendered HTML (not stripped text), absolute URLs,
 * audio enclosures/attachments, per-locale feed metadata, JSON Feed 1.1.
 */
import type { FeedOptions, Item } from 'feed'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createMarkdownProcessor } from '@astrojs/markdown-remark'
import { Feed } from 'feed'
import fs from 'fs-extra'
import type { SupportedLocale } from '../src/locales/config.ts'
import { getFeedName, getLanguageTag, localeConfig, supportedLocales } from '../src/locales/config.ts'
import { isPostIndexable } from '../src/utils/post-visibility.ts'
import { feedRehypePlugins, markdownProcessorOptions, remarkPlugins } from '../src/utils/markdown-pipeline.ts'
import { loadArticleFiles, type ArticleFile } from './lib/articles.ts'

const DOMAIN = 'https://teslak.me'
const AUTHOR = {
  name: 'Teslak',
  email: 'hi@teslak.me',
  link: DOMAIN,
}

const markdown = await createMarkdownProcessor({
  ...markdownProcessorOptions,
  remarkPlugins: [...remarkPlugins] as any,
  rehypePlugins: [...feedRehypePlugins] as any,
})

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case '\'': return '&#39;'
      default: return c
    }
  })
}

// ---------------------------------------------------------------------------
// Feed HTML normalization (ported verbatim from dg)
// ---------------------------------------------------------------------------

function normalizeFeedUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim())
    return undefined
  return value.startsWith('/') ? DOMAIN + value : value
}

function normalizeFeedHtml(html: string) {
  return html
    .replace(/\b(src|href|poster)=(["'])\/(?!\/)/g, `$1=$2${DOMAIN}/`)
    .replace(/\bsrcset=(["'])(.*?)\1/g, (_match, quote: string, srcset: string) => {
      const normalized = srcset
        .split(',')
        .map((candidate) => {
          const trimmed = candidate.trim()
          if (!trimmed.startsWith('/'))
            return trimmed
          return `${DOMAIN}${trimmed}`
        })
        .join(', ')
      return `srcset=${quote}${normalized}${quote}`
    })
}

async function getFeedContent(article: ArticleFile, locale: SupportedLocale, link: string) {
  const rendered = await markdown.render(article.content, {
    fileURL: pathToFileURL(resolve(article.file)),
    frontmatter: article.data,
  })
  const html = normalizeFeedHtml(rendered.code)
  const note = escapeHtml(localeConfig[locale].feedReaderNote)
  const href = escapeHtml(link)
  return `${html.trim()}\n\n<p><a href="${href}">${note}</a></p>\n`
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

function normalizeFeedAudio(audio: unknown) {
  if (!audio || typeof audio !== 'object' || Array.isArray(audio))
    return undefined
  const value = audio as Record<string, unknown>
  const normalizedUrl = normalizeFeedUrl(value.url)
  if (!normalizedUrl)
    return undefined
  return { ...value, url: normalizedUrl }
}

function getMimeType(url: string, fallbackType: string) {
  const ext = url.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    avif: 'image/avif',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    opus: 'audio/ogg',
    png: 'image/png',
    svg: 'image/svg+xml',
    wav: 'audio/wav',
    webp: 'image/webp',
  }
  return ext && mimeTypes[ext] ? mimeTypes[ext] : `${fallbackType}/${ext || 'octet-stream'}`
}

function getAudioAttachment(audio: Item['audio']) {
  if (!audio)
    return undefined
  const value = typeof audio === 'string' ? { url: audio } : audio
  const url = (value as Record<string, any>).url as string | undefined
  if (!url)
    return undefined
  return {
    url,
    mime_type: (value as Record<string, any>).type || getMimeType(url, 'audio'),
    ...((value as Record<string, any>).length ? { size_in_bytes: (value as Record<string, any>).length } : {}),
  }
}

function getFeedCategories(tags: unknown) {
  if (!Array.isArray(tags))
    return undefined
  const categories = tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map(tag => tag.trim().replace(/^#+/, ''))
    .filter(Boolean)
    .map(name => ({ name }))
  return categories.length ? categories : undefined
}

function toFeedDate(value: unknown, filePath: string, field: string): Date {
  const date = value instanceof Date ? value : new Date(value as string | number)
  if (Number.isNaN(date.getTime()))
    throw new Error(`[RSS] Invalid "${field}" in ${filePath}: ${String(value)}`)
  return date
}

function withAtomLanguage(xml: string, locale: SupportedLocale) {
  return xml.replace(
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${getLanguageTag(locale)}">`,
  )
}

// ---------------------------------------------------------------------------

async function buildLocaleFeed(locale: SupportedLocale, articles: ArticleFile[]) {
  const feedName = getFeedName(locale)
  const feedUrl = `${DOMAIN}/${feedName}`

  const options: FeedOptions = {
    title: localeConfig[locale].feedTitle,
    description: localeConfig[locale].feedDescription,
    id: `${DOMAIN}/${locale}/`,
    link: `${DOMAIN}/${locale}/`,
    language: getLanguageTag(locale),
    copyright: 'CC BY-NC-SA 4.0 2026 © Teslak',
    feedLinks: {
      json: `${feedUrl}.json`,
      atom: `${feedUrl}.atom`,
      rss: `${feedUrl}.xml`,
    },
  }

  const posts: Item[] = []
  for (const article of articles) {
    if (article.locale !== locale)
      continue
    // Skip posts that should not be indexed or distributed.
    if (!isPostIndexable(article.data))
      continue
    if ((article.data.lang || locale) !== locale)
      continue

    const link = `${DOMAIN}${article.path}`
    const publishedAt = toFeedDate(article.data.date, article.file, 'date')
    const updatedAt = article.data.updated
      ? toFeedDate(article.data.updated, article.file, 'updated')
      : publishedAt

    const item: Item = {
      id: link,
      title: article.data.title || article.slug,
      description: article.data.description || article.excerpt || undefined,
      category: getFeedCategories(article.data.tags || article.data.hashtags),
      // feed uses `date` as Atom <updated> / JSON Feed date_modified and
      // `published` as Atom <published> / RSS <pubDate>.
      date: updatedAt,
      published: publishedAt,
      content: await getFeedContent(article, locale, link),
      author: [AUTHOR],
      link,
    }

    const image = normalizeFeedUrl(article.image)
    if (image)
      item.image = image

    const audio = normalizeFeedAudio(article.data.audio)
    if (audio)
      item.audio = audio as Item['audio']

    posts.push(item)
  }

  posts.sort((a, b) => +new Date(b.date) - +new Date(a.date))
  if (posts.length)
    options.updated = posts[0].date

  return { feedName, options, posts }
}

function toJsonFeedAuthor(author = AUTHOR) {
  return { name: author.name, url: author.link }
}

function toJsonFeed(feed: Feed, options: FeedOptions, items: Item[], locale: SupportedLocale) {
  const jsonFeed = JSON.parse(feed.json1()) as Record<string, any>
  const author = toJsonFeedAuthor()

  jsonFeed.version = 'https://jsonfeed.org/version/1.1'
  jsonFeed.language = getLanguageTag(locale)
  jsonFeed.favicon = options.favicon
  jsonFeed.authors = [author]
  // Keep the deprecated JSON Feed 1.0 field for older readers.
  jsonFeed.author = author

  jsonFeed.items = (jsonFeed.items || []).map((jsonItem: Record<string, any>, index: number) => {
    const item = items[index]
    const attachment = getAudioAttachment(item.audio)
    const tags = item.category
      ?.map(category => category.name)
      .filter((name): name is string => !!name)

    return {
      ...jsonItem,
      id: item.id || item.link,
      language: getLanguageTag(locale),
      authors: [author],
      ...(tags?.length ? { tags } : {}),
      ...(attachment ? { attachments: [attachment] } : {}),
    }
  })

  return JSON.stringify(jsonFeed, null, 4)
}

async function writeFeed(name: string, options: FeedOptions, items: Item[], locale: SupportedLocale) {
  options.author = AUTHOR
  options.image = `${DOMAIN}/avatar.avif`
  options.favicon = `${DOMAIN}/logo.png`

  const feed = new Feed(options)
  items.forEach(item => feed.addItem(item))

  await fs.ensureDir(dirname(`./dist/${name}`))
  await fs.writeFile(`./dist/${name}.xml`, feed.rss2(), 'utf-8')
  await fs.writeFile(`./dist/${name}.atom`, withAtomLanguage(feed.atom1(), locale), 'utf-8')
  await fs.writeFile(`./dist/${name}.json`, toJsonFeed(feed, options, items, locale), 'utf-8')
}

async function run() {
  const articles = await loadArticleFiles()
  if (articles.length === 0) {
    console.error('[RSS] No articles found — refusing to write empty feeds. Is src/content/articles populated?')
    process.exit(1)
  }

  for (const locale of supportedLocales) {
    const { feedName, options, posts } = await buildLocaleFeed(locale, articles)
    await writeFeed(feedName, options, posts, locale)
    console.log(`[RSS] ${locale.toUpperCase()}: ${posts.length} posts → dist/${feedName}.xml`)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

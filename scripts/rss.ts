import type { FeedOptions, Item } from 'feed'
import type { SupportedLocale } from '../src/locales/config'
import { basename, dirname, resolve } from 'node:path'
import fg from 'fast-glob'
import { Feed } from 'feed'
import fs from 'fs-extra'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import GitHubAlerts from 'markdown-it-github-alerts'
import LinkAttributes from 'markdown-it-link-attributes'
import { contentSourceDirectory } from '../build/constants'
import { normalizeFrontmatter } from '../build/frontmatter'
import { registerCustomPlugins } from '../build/markdown-plugins'
import { finds } from '../src/data/finds'
import { getFeedName, getLanguageTag, localeConfig, supportedLocales } from '../src/locales/config'
import { getArticlePath } from '../src/logics/article-path'
import { isPostIndexable } from '../src/logics/post-visibility'
import { slugify } from './slugify'

const DOMAIN = 'https://teslak.me'
const AUTHOR = {
  name: 'Teslak',
  email: 'hi@teslak.me',
  link: DOMAIN,
}
const normalizedFrontmatterById = new Map<string, Record<string, any>>()
const markdown = MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
})
  .use(anchor, {
    slugify,
    permalink: false,
  })
  .use(LinkAttributes, {
    matcher: (link: string) => /^https?:\/\//.test(link),
    attrs: {
      target: '_blank',
      rel: 'noopener',
    },
  })
  .use(GitHubAlerts)

registerCustomPlugins(markdown, normalizedFrontmatterById)

const vueComponentBlockRE = /<([A-Z][\w.-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g
const vueComponentSelfClosingRE = /<[A-Z][\w.-]*(?:\s[^>]*)?\/?>/g
const vueDirectiveAttributeRE = /\s(?:[:@]|v-)[^\s=>]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/g
const glossaryTermBlockRE = /<GlossaryTerm(?:\s[^>]*)?>([\s\S]*?)<\/GlossaryTerm>/g

function normalizeFeedUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim())
    return undefined

  return value.startsWith('/') ? DOMAIN + value : value
}

function normalizeFeedHtml(html: string) {
  return stripVueOnlyHtml(html)
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

function stripVueOnlyHtml(html: string) {
  let current = html.replace(glossaryTermBlockRE, '$1')
  let previous = ''

  while (current !== previous) {
    previous = current
    current = current.replace(vueComponentBlockRE, '')
  }

  return current
    .replace(vueComponentSelfClosingRE, '')
    .replace(vueDirectiveAttributeRE, '')
}

function getFeedContent(content: string, locale: SupportedLocale, link: string, filePath: string) {
  const feedMarkdown = content.replace(/^\s*\[\[toc\]\]\s*$/gim, '')
  const html = normalizeFeedHtml(markdown.render(feedMarkdown, { id: filePath, path: filePath }))
  const note = markdown.utils.escapeHtml(localeConfig[locale].feedReaderNote)
  const href = markdown.utils.escapeHtml(link)

  return `${html.trim()}\n\n<p><a href="${href}">${note}</a></p>\n`
}

function normalizeFeedAudio(audio: unknown) {
  if (!audio || typeof audio !== 'object' || Array.isArray(audio))
    return undefined

  const value = audio as Record<string, unknown>
  const url = value.url
  if (typeof url !== 'string' || !url.trim())
    return undefined

  const normalizedUrl = normalizeFeedUrl(url)
  if (!normalizedUrl)
    return undefined

  return {
    ...value,
    url: normalizedUrl,
  }
}

function toFeedDate(value: unknown, filePath: string, field: string): Date {
  const date = value instanceof Date
    ? value
    : new Date(value as string | number)

  if (Number.isNaN(date.getTime()))
    throw new Error(`[RSS] Invalid "${field}" date in ${filePath}: ${String(value)}`)

  return date
}

function isFeedItem(item: Item | undefined): item is Item {
  return Boolean(item)
}

function getArticleLang(frontmatter: Record<string, any>, locale: SupportedLocale) {
  return typeof frontmatter.lang === 'string' && frontmatter.lang.trim()
    ? frontmatter.lang.trim()
    : locale
}

function getFeedCategories(tags: unknown) {
  if (!Array.isArray(tags))
    return undefined

  const categories = tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map(tag => tag.trim())
    .filter(Boolean)
    .map(name => ({ name }))

  return categories.length ? categories : undefined
}

function getFeedImage(frontmatter: Record<string, any>) {
  return normalizeFeedUrl(frontmatter.image)
    || `${DOMAIN}/og.png`
}

function getFeedDescription(frontmatter: Record<string, any>) {
  return typeof frontmatter.description === 'string' && frontmatter.description.trim()
    ? frontmatter.description
    : typeof frontmatter.excerpt === 'string' && frontmatter.excerpt.trim()
      ? frontmatter.excerpt
      : undefined
}

function getAudioAttachment(audio: Item['audio']) {
  if (!audio)
    return undefined

  const value = typeof audio === 'string'
    ? { url: audio }
    : audio

  const url = value.url
  if (!url)
    return undefined

  const attachment: Record<string, unknown> = {
    url,
    mime_type: value.type || getMimeType(url, 'audio'),
  }

  if (value.title)
    attachment.title = value.title
  if (value.length)
    attachment.size_in_bytes = value.length
  if (value.duration)
    attachment.duration_in_seconds = value.duration

  return attachment
}

function getMimeType(url: string, fallbackType: string) {
  const ext = new URL(url).pathname.split('.').pop()?.toLowerCase()
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

function withAtomLanguage(xml: string, locale: SupportedLocale) {
  return xml.replace(
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${getLanguageTag(locale)}">`,
  )
}

async function run() {
  for (const locale of supportedLocales) {
    await buildLocaleFeed(locale)
  }
}

async function buildLocaleFeed(locale: SupportedLocale) {
  const files = await fg(`pages/${locale}/${fg.escapePath(contentSourceDirectory)}/*.md`)

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

  const posts: Item[] = (
    await Promise.all(
      files
        .filter((i) => {
          const filename = basename(i)
          return filename !== 'index.md' && !filename.startsWith('[')
        })
        .map(async (i) => {
          const raw = await fs.readFile(i, 'utf-8')
          const { data, content } = matter(raw)
          const frontmatter = normalizeFrontmatter(data, content, i)
          normalizedFrontmatterById.set(resolve(i), frontmatter)

          // Skip posts that should not be indexed or distributed.
          if (!isPostIndexable(frontmatter))
            return

          if (getArticleLang(frontmatter, locale) !== locale)
            return

          const slug = basename(i, '.md')
          const link = `${DOMAIN}${getArticlePath(locale, slug)}`
          const html = getFeedContent(content, locale, link, i)
          const image = getFeedImage(frontmatter)
          const description = getFeedDescription(frontmatter)
          const categories = getFeedCategories(frontmatter.tags)

          const publishedAt = toFeedDate(frontmatter.date, i, 'date')
          const updatedAt = frontmatter.updated
            ? toFeedDate(frontmatter.updated, i, 'updated')
            : publishedAt

          const item = {
            ...frontmatter,
            id: link,
            title: frontmatter.title || slug,
            description,
            category: categories,
            // feed uses `date` as Atom `<updated>` / JSON Feed `date_modified`.
            date: updatedAt,
            // feed uses `published` as Atom `<published>` / JSON Feed
            // `date_published`; it also keeps RSS `<pubDate>` on publication.
            published: publishedAt,
            content: html,
            author: [AUTHOR],
            link,
          } as Item
          if (image)
            item.image = image
          else
            delete item.image

          const audio = normalizeFeedAudio(frontmatter.audio)
          if (audio)
            item.audio = audio
          else
            delete item.audio

          return item
        }),
    ))
    .filter(isFeedItem)

  const items = [...posts, ...getFindFeedItems()]
  items.sort((a, b) => +new Date(b.date) - +new Date(a.date))

  if (items.length)
    options.updated = items[0].date

  await writeFeed(feedName, options, items, locale)

  console.log(`[RSS] ${locale.toUpperCase()}: ${posts.length} posts + ${items.length - posts.length} finds → dist/${feedName}.xml`)
}

function getFindFeedItems(): Item[] {
  const ids = new Set<string>()

  return finds
    .filter(find => !!find.date)
    .map((find) => {
      if (ids.has(find.id))
        throw new Error(`[RSS] Duplicate find id: ${find.id}`)
      ids.add(find.id)

      const date = toFeedDate(find.date, `find:${find.id}`, 'date')
      const url = new URL(find.url)
      if (!['http:', 'https:'].includes(url.protocol))
        throw new Error(`[RSS] Unsupported find URL protocol for ${find.id}: ${url.protocol}`)

      const href = markdown.utils.escapeHtml(url.href)
      const domain = markdown.utils.escapeHtml(url.hostname.replace(/^www\./, ''))
      const description = find.desc?.trim()
      const content = [
        description ? `<p>${markdown.utils.escapeHtml(description)}</p>` : '',
        `<p><a href="${href}">${domain}</a></p>`,
      ].filter(Boolean).join('\n')

      return {
        id: `urn:teslak:find:${find.id}`,
        title: find.title,
        description,
        content,
        date,
        published: date,
        author: [AUTHOR],
        category: [{ name: 'find' }],
        link: url.href,
      } as Item
    })
}

function toJsonFeedAuthor(author = AUTHOR) {
  return {
    name: author.name,
    url: author.link,
  }
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
  options.image = 'https://teslak.me/avatar.avif'
  options.favicon = 'https://teslak.me/logo.png'

  const feed = new Feed(options)

  items.forEach(item => feed.addItem(item))

  await fs.ensureDir(dirname(`./dist/${name}`))
  await fs.writeFile(`./dist/${name}.xml`, feed.rss2(), 'utf-8')
  await fs.writeFile(`./dist/${name}.atom`, withAtomLanguage(feed.atom1(), locale), 'utf-8')
  await fs.writeFile(`./dist/${name}.json`, toJsonFeed(feed, options, items, locale), 'utf-8')
}

run()

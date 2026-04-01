import type {
  LocaleOverview,
  MarkdownPageDocument,
  MarkdownPageFrontmatter,
  PostDocument,
  PostFrontmatter,
  PostReference,
  PostSummary,
} from './content-shared'
import type { SupportedLocale } from './locales'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import GitHubAlerts from 'markdown-it-github-alerts'
import LinkAttributes from 'markdown-it-link-attributes'
import MarkdownItMagicLink from 'markdown-it-magic-link'
import { slugify } from '../../../scripts/slugify'
import { isDraftPost } from './content-shared'
import { isSupportedLocale } from './locales'
import { magicLinks } from './magic-links'

interface LoadedPostEntry {
  slug: string
  frontmatter: PostFrontmatter
  content: string
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const pagesRoot = resolve(repoRoot, 'pages')
const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  quotes: '""\'\'',
})
const simplePageSlugs = new Set(['bar', 'bookmarks', 'use'])

markdown.use(anchor, {
  slugify,
  permalink: anchor.permalink.linkInsideHeader({
    symbol: '#',
    renderAttrs: () => ({ 'aria-hidden': 'true' }),
  }),
})

markdown.use(LinkAttributes, {
  matcher: (link: string) => /^https?:\/\//.test(link),
  attrs: {
    target: '_blank',
    rel: 'noopener',
  },
})

markdown.use(MarkdownItMagicLink, {
  linksMap: magicLinks,
})

markdown.use(GitHubAlerts)

markdown.core.ruler.after('inline', 'image_figures', (state) => {
  const tokens = state.tokens
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token.type !== 'paragraph_open')
      continue

    const inline = tokens[index + 1]
    const close = tokens[index + 2]
    if (!inline || inline.type !== 'inline' || !close || close.type !== 'paragraph_close')
      continue

    const children = inline.children || []
    if (children.length !== 1 || children[0].type !== 'image')
      continue

    const imageToken = children[0]
    const alt = imageToken.content?.trim()
    if (!alt)
      continue

    token.type = 'figure_open'
    token.tag = 'figure'
    close.type = 'figure_close'
    close.tag = 'figure'

    const caption = new state.Token('html_block', '', 0)
    caption.content = `<figcaption>${markdown.utils.escapeHtml(alt)}</figcaption>\n`

    tokens.splice(index + 2, 0, caption)
    index += 1
  }
})

markdown.inline.ruler.before('emphasis', 'mark', (state, silent) => {
  if (silent)
    return false

  const start = state.pos
  const source = state.src
  if (source.charCodeAt(start) !== 0x3D || source.charCodeAt(start + 1) !== 0x3D)
    return false

  const end = source.indexOf('==', start + 2)
  if (end === -1)
    return false

  const content = source.slice(start + 2, end)
  if (!content)
    return false

  const tokenOpen = state.push('mark_open', 'mark', 1)
  tokenOpen.markup = '=='
  const tokenText = state.push('text', '', 0)
  tokenText.content = content
  const tokenClose = state.push('mark_close', 'mark', -1)
  tokenClose.markup = '=='

  state.pos = end + 2
  return true
})

export async function getHomeOverview(): Promise<LocaleOverview[]> {
  return Promise.all(
    (['en', 'ru', 'es'] as const).map(async (locale) => {
      const articles = await listPosts(locale, 'blog')
      const notes = await listPosts(locale, 'note')
      return {
        locale,
        articles: articles.length,
        notes: notes.length,
        latestArticles: articles.slice(0, 4),
        latestNotes: notes.slice(0, 4),
      }
    }),
  )
}

export async function getLocaleOverview(
  locale: SupportedLocale,
): Promise<LocaleOverview> {
  const articles = await listPosts(locale, 'blog')
  const notes = await listPosts(locale, 'note')
  return {
    locale,
    articles: articles.length,
    notes: notes.length,
    latestArticles: articles.slice(0, 6),
    latestNotes: notes.slice(0, 6),
  }
}

export async function listPosts(
  locale: SupportedLocale,
  type?: 'blog' | 'note',
): Promise<PostSummary[]> {
  const entries = await loadPostEntries(locale)
  return entries
    .filter(entry => isPostVisible(entry.frontmatter))
    .filter(entry => !type || hasType(entry.frontmatter.type, type))
    .map(entry => toPostSummary(locale, entry.slug, entry.frontmatter))
    .filter((post): post is PostSummary => post !== null)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
}

export async function getPost(
  locale: string,
  slug: string,
): Promise<PostDocument | null> {
  if (!isSupportedLocale(locale))
    return null

  const entry = await loadPostEntry(locale, slug)
  if (!entry || !isPostVisible(entry.frontmatter))
    return null

  const summary = toPostSummary(locale, slug, entry.frontmatter)
  if (!summary)
    return null

  return {
    ...summary,
    backlink: entry.frontmatter.backlink,
    telegram: entry.frontmatter.telegram,
    mastodon: entry.frontmatter.mastodon,
    originalLocale: entry.frontmatter.originalLocale,
    wrapperClass: entry.frontmatter.wrapperClass,
    className: entry.frontmatter.class,
    tocAlwaysOn: entry.frontmatter.tocAlwaysOn,
    html: renderMarkdown(entry.content, locale),
    raw: entry.content,
  }
}

export async function getPostBacklinks(
  locale: SupportedLocale,
  backlink: string | string[] | undefined,
): Promise<PostReference[]> {
  const slugs = normalizeBacklinks(backlink)
  if (!slugs.length)
    return []

  const posts = await listPosts(locale)
  const postMap = new Map(posts.map(post => [post.slug, post]))

  return slugs
    .map(slug => postMap.get(slug))
    .filter((post): post is PostSummary => post != null)
    .map(toPostReference)
}

export async function getReferencedBy(
  locale: SupportedLocale,
  slug: string,
): Promise<PostReference[]> {
  const entries = await loadPostEntries(locale)
  return entries
    .filter(entry => isPostVisible(entry.frontmatter))
    .filter((entry) => {
      return normalizeBacklinks(entry.frontmatter.backlink).includes(slug)
    })
    .map(entry => toPostSummary(locale, entry.slug, entry.frontmatter))
    .filter((post): post is PostSummary => post !== null)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .map(toPostReference)
}

export async function getAdjacentPosts(
  locale: SupportedLocale,
  slug: string,
  type: 'blog' | 'note',
): Promise<{ newer: PostReference | null, older: PostReference | null }> {
  const posts = await listPosts(locale, type)
  const index = posts.findIndex(post => post.slug === slug)

  return {
    newer: index > 0 ? toPostReference(posts[index - 1]) : null,
    older: index >= 0 && index < posts.length - 1 ? toPostReference(posts[index + 1]) : null,
  }
}

export async function getPage(
  locale: string,
  slug: string,
): Promise<MarkdownPageDocument | null> {
  if (!isSupportedLocale(locale) || !simplePageSlugs.has(slug))
    return null

  const file = resolve(pagesRoot, locale, `${slug}.md`)
  try {
    const raw = await readFile(file, 'utf-8')
    const parsed = matter(raw)
    const frontmatter = parsed.data as MarkdownPageFrontmatter

    if (!frontmatter.title)
      return null
    if (hasUnsupportedEmbeds(parsed.content))
      return null

    return {
      slug,
      locale,
      title: frontmatter.title,
      display: frontmatter.display,
      subtitle: frontmatter.subtitle,
      description: frontmatter.description,
      className: frontmatter.class,
      layoutFullWidth: /<!--\s*@layout-full-width\s*-->/.test(parsed.content),
      html: renderMarkdown(parsed.content, locale),
      raw: parsed.content,
    }
  }
  catch {
    return null
  }
}

function isPostVisible(frontmatter: PostFrontmatter): boolean {
  if (!frontmatter.date)
    return false
  return !isDraftPost(frontmatter.type, frontmatter.draft)
}

function hasType(typeValue: string | undefined, type: 'blog' | 'note'): boolean {
  const types = (typeValue || 'blog').split('+').filter(Boolean)
  return types.includes(type)
}

function renderMarkdown(content: string, locale: SupportedLocale): string {
  const transformed = transformLegacyEmbeds(content, locale)
  return localizeSiteLinks(
    markdown.render(transformed.replace(/^\[\[toc\]\]\s*$/gim, '').trim()),
    locale,
  )
}

function hasUnsupportedEmbeds(content: string): boolean {
  return /<\s*[A-Z][\w-]*/.test(content)
}

function localizeSiteLinks(html: string, locale: SupportedLocale): string {
  return html.replace(/href="([^"]+)"/g, (_, href: string) => {
    const resolved = resolveSiteHref(href, locale)
    return `href="${resolved}"`
  })
}

function resolveSiteHref(href: string, locale: SupportedLocale): string {
  if (/^(?:https?:|mailto:|tel:|#)/.test(href))
    return href
  if (/^\/(?:en|ru|es)(?:\/|$)/.test(href))
    return href
  if (/^\/posts(?:\/|$)/.test(href))
    return `/${locale}${href.replace(/^\/posts/, '/articles')}`
  if (/^\/(?:articles|notes|projects|photos|media|use|bookmarks|bar)(?:\/|$)/.test(href))
    return `/${locale}${href}`
  return href
}

function transformLegacyEmbeds(content: string, locale: SupportedLocale): string {
  return content
    .replace(/<YouTubeEmbed\s+id=["']([^"']+)["'][^>]*\/>/g, (_, id: string) => {
      return [
        '<div class="my-8">',
        `<iframe class="aspect-video w-full rounded-xl shadow lg:w-[120%] lg:-mx-[10%]" src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
        '</div>',
      ].join('')
    })
    .replace(/<GitHubLink\b[^>]*\/>/g, (match: string) => {
      const repo = readAttr(match, 'repo')
      if (!repo)
        return ''

      const name = readAttr(match, 'name') || (repo.startsWith('antfu/') ? repo.slice(6) : repo)
      return [
        '<span class="whitespace-nowrap">',
        '<span aria-hidden="true" class="i-carbon-logo-github inline-block"></span>',
        ` <a class="ml-1 font-mono op70" href="https://github.com/${repo}" target="_blank" rel="noopener noreferrer">${name}</a>`,
        '</span>',
      ].join('')
    })
    .replace(/<SponsorButtonCollective\s*\/>/g, () => {
      const label = locale === 'ru'
        ? 'Поддержать экосистему'
        : locale === 'es'
          ? 'Patrocinar el ecosistema'
          : 'Sponsor the ecosystem'

      return [
        '<a href="https://opencollective.com/antfu" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-lg border border-rose-400 px-3 py-2 no-underline text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30">',
        '<span aria-hidden="true" class="i-ph-hand-heart-duotone"></span>',
        `<span>${label}</span>`,
        '</a>',
      ].join('')
    })
    .replace(/<Logo[^>]*\/>/g, () => {
      return '<img src="/logo.svg" alt="Anthony Fu logo" class="mx-auto my-4 h-30 w-30" />'
    })
    .replace(/<Slidev(?:\s+class=["']([^"']+)["'])?\s*\/>/g, (_, className?: string) => {
      const extraClass = className || 'inline'
      return `<span class="${extraClass} font-semibold">Slidev</span>`
    })
    .replace(/<Tweet([^>]*)>([\s\S]*?)<\/Tweet>/g, (_, attrs: string, inner: string) => {
      const conversation = readAttr(attrs, 'conversation')
      const conversationAttr = conversation ? ` data-conversation="${conversation}"` : ''
      return [
        '<div class="my-8 flex justify-center">',
        `<blockquote class="twitter-tweet w-full rounded-xl border border-base px-4 py-3"${conversationAttr}>${inner.trim()}</blockquote>`,
        '</div>',
      ].join('')
    })
}

function readAttr(source: string, name: string): string | undefined {
  const match = source.match(new RegExp(`${name}=["']([^"']+)["']`))
  return match?.[1]
}

function normalizeBacklinks(backlink: string | string[] | undefined): string[] {
  if (!backlink)
    return []

  return [...new Set(Array.isArray(backlink) ? backlink : [backlink])]
}

function toPostSummary(
  locale: SupportedLocale,
  slug: string,
  frontmatter: PostFrontmatter,
): PostSummary | null {
  if (!frontmatter.title || !frontmatter.date)
    return null

  return {
    slug,
    locale,
    title: frontmatter.title,
    date: frontmatter.date,
    updated: frontmatter.updated,
    description: frontmatter.description,
    duration: frontmatter.duration,
    lang: frontmatter.lang,
    redirect: frontmatter.redirect,
    type: frontmatter.type,
    subtitle: frontmatter.subtitle,
    place: frontmatter.place,
    placeLink: frontmatter.placeLink,
    draft: frontmatter.draft,
    url: frontmatter.redirect || `/${locale}/articles/${slug}`,
  }
}

function toPostReference(post: PostSummary): PostReference {
  return {
    slug: post.slug,
    locale: post.locale,
    title: post.title,
    url: post.url,
    date: post.date,
    updated: post.updated,
    lang: post.lang,
    type: post.type,
  }
}

async function loadPostEntry(
  locale: SupportedLocale,
  slug: string,
): Promise<LoadedPostEntry | null> {
  const file = resolve(pagesRoot, locale, 'articles', `${slug}.md`)
  try {
    const raw = await readFile(file, 'utf-8')
    const parsed = matter(raw)
    return {
      slug,
      frontmatter: parsed.data as PostFrontmatter,
      content: parsed.content,
    }
  }
  catch {
    return null
  }
}

async function loadPostEntries(locale: SupportedLocale): Promise<LoadedPostEntry[]> {
  const files = await fg(resolve(pagesRoot, locale, 'articles', '*.md'))
  return Promise.all(
    files.map(async (file) => {
      const slug = file.split(/[/\\]/).pop()?.replace(/\.md$/, '')
      if (!slug)
        return null

      const raw = await readFile(file, 'utf-8')
      const parsed = matter(raw)
      return {
        slug,
        frontmatter: parsed.data as PostFrontmatter,
        content: parsed.content,
      }
    }),
  ).then(entries => entries.filter((entry): entry is LoadedPostEntry => entry !== null))
}

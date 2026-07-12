import { getCollection, type CollectionEntry } from 'astro:content'
import type { SupportedLocale } from '~/locales/config'
import { isSupportedLocale, supportedLocales } from '~/locales/config'
import { getArticlePath } from './article-path.ts'
import { buildArticleStates, getArticleServedLocales, getIndexableLocales, type ArticleStatesBySlug } from './article-locales.ts'
import { estimateReadingMinutes, extractExcerpt } from './content-cleanup.ts'
import { isDraftPost, isPostVisible } from './post-visibility.ts'
import { daysUntil, parseReadingMinutes } from './i18n'

export { isDraftPost, isPostVisible }

export interface PostSummary {
  path: string
  title: string
  date?: Date
  updated?: Date
  lang?: string
  duration?: number
  redirect?: string
  place?: string
  placeLink?: string
  type?: string
  description?: string
  draft?: boolean
  robots?: string
  excerpt?: string
  image?: string
  tags?: string[]
  locale: SupportedLocale
  slug: string
  backlink?: string | string[]
  /** Locales where this physical translation is reachable (own page or alias). */
  servedLocales: SupportedLocale[]
  /** Locales with an indexable physical translation of this slug. */
  availableLocales: SupportedLocale[]
}

export function localeFromId(id: string): SupportedLocale | undefined {
  const localeSegment = id.split('/')[0]
  return isSupportedLocale(localeSegment) ? localeSegment : undefined
}

export function slugFromId(id: string): string {
  const withoutLocale = id.split('/').slice(1).join('/')
  return (withoutLocale || id).replace(/\.[^.]+$/, '')
}

function normalizeTags(data: Record<string, any>): string[] | undefined {
  const raw = data.tags ?? data.hashtags
  if (!Array.isArray(raw))
    return undefined
  const tags = raw
    .filter((tag: unknown): tag is string => typeof tag === 'string')
    .map(tag => tag.trim().replace(/^#+/, ''))
    .filter(Boolean)
  return tags.length ? tags : undefined
}

/**
 * The single data-layer normalization point (the counterpart of dg's
 * `normalizeFrontmatter`): reading time estimation, excerpt extraction and
 * the generated OG-image fallback all happen here so every consumer — pages,
 * feeds, search — sees the same values.
 */
function toPostSummary(
  entry: CollectionEntry<'articles'>,
  statesBySlug: ArticleStatesBySlug,
): PostSummary | undefined {
  const locale = localeFromId(entry.id)
  if (!locale)
    return undefined
  const slug = slugFromId(entry.id)
  const data = entry.data
  const body = entry.body ?? ''

  const date = data.date instanceof Date ? data.date : (data.date ? new Date(data.date) : undefined)
  const updated = data.updated instanceof Date ? data.updated : (data.updated ? new Date(data.updated) : undefined)
  const duration = parseReadingMinutes(data.duration) ?? (body ? estimateReadingMinutes(body) : undefined)
  const excerpt = data.excerpt || (body ? extractExcerpt(body, 400) : undefined)
  const image = data.image || (data.title ? `/og/${slug}.png` : undefined)

  const states = statesBySlug.get(slug) ?? []
  return {
    path: getArticlePath(locale, slug),
    title: data.title || slug,
    date,
    updated,
    lang: data.lang,
    duration,
    redirect: data.redirect,
    place: data.place,
    placeLink: data.placeLink,
    type: data.type,
    description: data.description,
    draft: data.draft,
    robots: data.robots,
    excerpt,
    image,
    tags: normalizeTags(data),
    locale,
    slug,
    backlink: data.backlink,
    servedLocales: getArticleServedLocales(locale, states),
    availableLocales: getIndexableLocales(states),
  }
}

interface ArticlesData {
  /** Visible posts only — for lists, navigation, feeds-like consumers. */
  visible: PostSummary[]
  /** Every physical article including hidden drafts (preview URLs). */
  all: PostSummary[]
  statesBySlug: ArticleStatesBySlug
  entriesById: Map<string, CollectionEntry<'articles'>>
}

let cache: Promise<ArticlesData> | undefined

async function loadArticles(): Promise<ArticlesData> {
  const entries = await getCollection('articles')
  const refs = entries.flatMap((entry) => {
    const locale = localeFromId(entry.id)
    if (!locale)
      return []
    return [{ locale, slug: slugFromId(entry.id), data: entry.data }]
  })
  const statesBySlug = buildArticleStates(refs)

  const all: PostSummary[] = []
  const entriesById = new Map<string, CollectionEntry<'articles'>>()
  for (const entry of entries) {
    const summary = toPostSummary(entry, statesBySlug)
    if (!summary)
      continue
    all.push(summary)
    entriesById.set(entry.id, entry)
  }

  return {
    visible: all.filter(post => isPostVisible(post)),
    all,
    statesBySlug,
    entriesById,
  }
}

export function getArticlesData(): Promise<ArticlesData> {
  if (!cache)
    cache = loadArticles()
  return cache
}

export async function getAllArticles(): Promise<PostSummary[]> {
  const { visible } = await getArticlesData()
  return visible
}

export async function getBacklinksFor(backlinkField: string | string[] | undefined, currentLocale: SupportedLocale): Promise<PostSummary[]> {
  if (!backlinkField)
    return []
  const slugs = Array.isArray(backlinkField) ? backlinkField : [backlinkField]
  const uniqueSlugs = [...new Set(slugs)]
  const all = await getAllArticles()

  const results: PostSummary[] = []
  for (const slug of uniqueSlugs) {
    // Prefer the reader's locale, fall back to any served translation.
    const found = all.find(post => post.slug === slug && post.locale === currentLocale)
      ?? all.find(post => post.slug === slug && post.servedLocales.includes(currentLocale))
    if (found) {
      results.push({
        ...found,
        path: getArticlePath(currentLocale, slug),
      })
    }
    else if (!all.some(post => post.slug === slug)) {
      console.warn(`[posts] backlink "${slug}" does not match any article.`)
    }
  }
  return results
}

export async function getReferencedByFor(currentSlug: string, currentLocale: SupportedLocale): Promise<PostSummary[]> {
  const all = await getAllArticles()
  const results = all.filter((post) => {
    if (!post.backlink)
      return false
    if (!post.servedLocales.includes(currentLocale))
      return false
    // Only one physical translation represents the slug in a given locale.
    if (post.locale !== currentLocale && all.some(other => other.slug === post.slug && other.locale === currentLocale))
      return false
    const list = Array.isArray(post.backlink) ? post.backlink : [post.backlink]
    return list.includes(currentSlug)
  }).map(post => ({
    ...post,
    path: getArticlePath(currentLocale, post.slug),
  }))
  return sortByDateDesc(results)
}

export function filterByLocale(posts: PostSummary[], locale: SupportedLocale): PostSummary[] {
  return posts.filter(post => post.locale === locale)
}

export function filterByType(posts: PostSummary[], type: 'note' | 'blog' | 'all'): PostSummary[] {
  if (type === 'all')
    return posts
  return posts.filter((post) => {
    const types = (post.type || 'blog').split('+')
    return types.includes(type)
  })
}

export function sortByDateDesc(posts: PostSummary[]): PostSummary[] {
  return [...posts].sort((a, b) => {
    const ad = a.date ? a.date.getTime() : 0
    const bd = b.date ? b.date.getTime() : 0
    return bd - ad
  })
}

export function isFuture(date?: Date): boolean {
  return !!date && date.getTime() > Date.now()
}

export interface YearGroup {
  label: string
  future: boolean
  items: PostSummary[]
}

export function groupByYear(posts: PostSummary[]): YearGroup[] {
  const groups = new Map<string, YearGroup>()
  for (const post of posts) {
    if (!post.date)
      continue
    const future = isFuture(post.date)
    const label = future ? 'upcoming' : String(post.date.getFullYear())
    const key = `${future ? 'f' : 'p'}|${label}`
    if (!groups.has(key))
      groups.set(key, { label, future, items: [] })
    groups.get(key)!.items.push(post)
  }
  return [...groups.values()]
}

export { daysUntil, supportedLocales }

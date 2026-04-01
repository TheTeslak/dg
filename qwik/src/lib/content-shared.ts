import type { SupportedLocale } from './locales'
import { localeDateTag } from './locales'

export interface PostFrontmatter {
  title?: string
  date?: string
  updated?: string
  description?: string
  duration?: string | number
  lang?: string
  redirect?: string
  type?: string
  tags?: string[]
  backlink?: string | string[]
  place?: string
  placeLink?: string
  subtitle?: string
  telegram?: string
  mastodon?: string
  originalLocale?: string
  draft?: boolean
  wrapperClass?: string
  class?: string
  tocAlwaysOn?: boolean
}

export interface PostSummary {
  slug: string
  locale: SupportedLocale
  title: string
  date: string
  updated?: string
  description?: string
  duration?: string | number
  lang?: string
  redirect?: string
  type?: string
  subtitle?: string
  place?: string
  placeLink?: string
  draft?: boolean
  url: string
}

export interface PostDocument extends PostSummary {
  backlink?: string | string[]
  telegram?: string
  mastodon?: string
  originalLocale?: string
  wrapperClass?: string
  className?: string
  tocAlwaysOn?: boolean
  html: string
  raw: string
}

export interface PostReference {
  slug: string
  locale: SupportedLocale
  title: string
  url: string
  date: string
  updated?: string
  lang?: string
  type?: string
}

export interface LocaleOverview {
  locale: SupportedLocale
  articles: number
  notes: number
  latestArticles: PostSummary[]
  latestNotes: PostSummary[]
}

export interface MarkdownPageFrontmatter {
  title?: string
  display?: string
  subtitle?: string
  description?: string
  class?: string
}

export interface MarkdownPageDocument {
  slug: string
  locale: SupportedLocale
  title: string
  display?: string
  subtitle?: string
  description?: string
  className?: string
  layoutFullWidth?: boolean
  html: string
  raw: string
}

export function formatDate(locale: SupportedLocale, date: string): string {
  const value = new Date(date)
  if (Number.isNaN(value.getTime()))
    return ''

  const includeYear = value.getFullYear() !== new Date().getFullYear()
  return new Intl.DateTimeFormat(localeDateTag(locale), {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  }).format(value)
}

export function parseReadingMinutes(duration: unknown): number | undefined {
  if (typeof duration === 'number' && Number.isFinite(duration))
    return Math.max(1, Math.round(duration))

  if (typeof duration === 'string') {
    const match = duration.trim().match(/^(\d+)(?:\s*min)?$/i)
    if (match)
      return Math.max(1, Number.parseInt(match[1], 10))
  }

  return undefined
}

export function formatReadingDuration(
  locale: SupportedLocale,
  duration?: string | number,
): string | undefined {
  const minutes = parseReadingMinutes(duration)
  if (minutes == null)
    return undefined

  return locale === 'ru'
    ? `${minutes} мин`
    : `${minutes} min`
}

export function stripSiteSuffix(title: string): string {
  return title.replace(/\s*-\s*Anthony Fu\s*$/, '')
}

export function isDraftPost(type?: string, draft?: boolean): boolean {
  if (draft)
    return true
  return (type || '').split('+').includes('draft')
}

export function isRecentPost(date: string, updated?: string): boolean {
  const target = new Date(updated || date)
  if (Number.isNaN(target.getTime()))
    return false

  return Date.now() - target.getTime() < 15 * 24 * 60 * 60 * 1000
}

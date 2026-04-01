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
  url: string
}

export interface PostDocument extends PostSummary {
  html: string
  raw: string
}

export interface LocaleOverview {
  locale: SupportedLocale
  articles: number
  notes: number
  latestArticles: PostSummary[]
  latestNotes: PostSummary[]
}

export function formatDate(locale: SupportedLocale, date: string): string {
  return new Intl.DateTimeFormat(localeDateTag(locale), {
    dateStyle: 'medium',
  }).format(new Date(date))
}

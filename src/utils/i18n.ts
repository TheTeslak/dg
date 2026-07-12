import type { MessageDictionary, MessageVars } from '~/locales/messages/types'
import type { SupportedLocale } from '~/locales/config'
import {
  defaultLocale,
  getDateLocale,
  getLanguageTag,
  getMessageFallbackOrder,
  isSupportedLocale,
  localeConfig,
  localeSegmentPattern,
  supportedLocales,
} from '~/locales/config'
import de from '~/locales/messages/de'
import en from '~/locales/messages/en'
import es from '~/locales/messages/es'
import fr from '~/locales/messages/fr'
import pt from '~/locales/messages/pt'
import ru from '~/locales/messages/ru'

export {
  defaultLocale,
  getLanguageTag,
  isSupportedLocale,
  localeConfig,
  supportedLocales,
}
export type { SupportedLocale }

const dictionaries: Record<SupportedLocale, MessageDictionary> = {
  de, en, es, fr, pt, ru,
}

// ---------------------------------------------------------------------------
// Locale-aware paths (ported from dg `src/logics/i18n-path.ts`)
// ---------------------------------------------------------------------------

const localePrefixRE = new RegExp(`^/(${localeSegmentPattern})(?=/|$)`)

export function getLocaleFromPath(path: string): SupportedLocale {
  const match = path.match(localePrefixRE)
  return match && isSupportedLocale(match[1]) ? match[1] : defaultLocale
}

export function isLocaleRootPath(path: string) {
  const normalizedPath = path.replace(/\/+$/, '') || '/'
  return normalizedPath === '/' || supportedLocales.some(locale => normalizedPath === `/${locale}`)
}

export function setPathLocale(path: string, locale: SupportedLocale): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (localePrefixRE.test(normalizedPath))
    return normalizedPath.replace(localePrefixRE, `/${locale}`)

  if (normalizedPath === '/')
    return `/${locale}`

  return `/${locale}${normalizedPath}`
}

export function localePath(currentLocale: SupportedLocale, path = '') {
  if (!path)
    return `/${currentLocale}`
  if (/^(?:https?:|mailto:|#)/.test(path))
    return path
  const clean = path.startsWith('/') ? path : `/${path}`
  const explicitLocale = clean.split('/')[1]
  if (isSupportedLocale(explicitLocale))
    return clean
  return `/${currentLocale}${clean}`
}

// ---------------------------------------------------------------------------
// Messages: template strings with `{var}` placeholders or functions for
// plural/select messages, with the per-locale fallback order from the config.
// ---------------------------------------------------------------------------

export function makeT(locale: SupportedLocale) {
  const order = getMessageFallbackOrder(locale)
  return function t(key: string, vars?: MessageVars): string {
    for (const candidate of order) {
      const message = dictionaries[candidate]?.[key]
      if (message == null)
        continue
      if (typeof message === 'function')
        return message(vars ?? {})
      if (!vars)
        return message
      return message.replace(/\{(\w+)\}/g, (_match, name: string) => {
        const value = vars[name]
        return value == null ? `{${name}}` : String(value)
      })
    }
    return key
  }
}

export type Translator = ReturnType<typeof makeT>

export const localeFullNames: Record<SupportedLocale, string> = Object.fromEntries(
  supportedLocales.map(locale => [locale, localeConfig[locale].nativeName]),
) as Record<SupportedLocale, string>

// ---------------------------------------------------------------------------
// Dates (ported from dg `src/logics/index.ts` formatDate semantics)
// ---------------------------------------------------------------------------

function parseDisplayDate(value: string | Date): Date {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/)
    if (match)
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  return value instanceof Date ? value : new Date(value)
}

function toIntlTag(locale: SupportedLocale) {
  const dateLocale = getDateLocale(locale)
  return dateLocale === 'pt-br' ? 'pt-BR' : dateLocale
}

function shortMonth(date: Date, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(toIntlTag(locale), { month: 'short' })
    .format(date)
    .replace(/\.$/, '')
}

/**
 * `onlyDate: true` (lists) never shows the year; otherwise the year appears
 * only when it differs from the current one — exactly like the original site.
 */
export function formatDate(value: string | Date | undefined, onlyDate = true, locale: SupportedLocale = defaultLocale): string {
  if (!value)
    return ''
  const date = parseDisplayDate(value)
  if (Number.isNaN(date.getTime()))
    return ''

  const includeYear = !onlyDate && date.getFullYear() !== new Date().getFullYear()
  const month = shortMonth(date, locale)
  const day = date.getDate()
  const year = date.getFullYear()

  if (locale === 'en')
    return includeYear ? `${month} ${day}, ${year}` : `${month} ${day}`
  return includeYear ? `${day} ${month} ${year}` : `${day} ${month}`
}

export function isRecentPost(date: string | Date | undefined, updated?: string | Date): boolean {
  if (!date)
    return false
  const effective = updated ? new Date(updated) : new Date(date)
  if (Number.isNaN(effective.getTime()))
    return false
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  // 1-day grace period: show 🌱 even if the date is slightly in the future
  // (handles timezone mismatches and minor scheduling errors)
  return (now - effective.getTime()) < 15 * dayMs && effective.getTime() < now + dayMs
}

export function daysUntil(date: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
}

// ---------------------------------------------------------------------------
// Reading duration
// ---------------------------------------------------------------------------

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

export function formatReadingDuration(duration: unknown, locale: SupportedLocale = defaultLocale): string | undefined {
  const minutes = parseReadingMinutes(duration)
  if (minutes == null)
    return undefined
  return `${minutes} ${localeConfig[locale].minuteAbbreviation}`
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '')
  }
}

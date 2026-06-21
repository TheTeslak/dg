/**
 * Locale negotiation is only for neutral entry routes (`/` and `/index.html`).
 * Explicit locale URLs stay stable; cookie choice outranks the browser hint.
 */
import type { SupportedLocale } from './config'
import { defaultLocale, isSupportedLocale, resolveSupportedLocale } from './config'

const languageRangeRE = /^(?:[a-z]{1,8}(?:-[a-z0-9]{1,8})*|\*)$/i
const qualityValueRE = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/

function parseLanguagePreference(part: string, index: number) {
  const [rawRange, ...parameters] = part.split(';')
  const range = rawRange.trim().replace(/_/g, '-')
  if (!languageRangeRE.test(range))
    return

  let quality = 1
  let hasQuality = false

  for (const parameter of parameters) {
    const normalizedParameter = parameter.trim()
    const separatorIndex = normalizedParameter.indexOf('=')
    const name = normalizedParameter.slice(0, separatorIndex).trim().toLowerCase()
    const value = normalizedParameter.slice(separatorIndex + 1).trim()
    if (separatorIndex < 0 || name !== 'q' || hasQuality || !qualityValueRE.test(value))
      return
    quality = Number(value)
    hasQuality = true
  }

  if (quality === 0)
    return

  return { index, quality, range }
}

export function resolveLocalePreference(value: unknown): SupportedLocale | undefined {
  return typeof value === 'string' && isSupportedLocale(value)
    ? value
    : undefined
}

export function getPreferredLocale(acceptLanguage: string | null | undefined): SupportedLocale {
  if (!acceptLanguage)
    return defaultLocale

  const preferences = acceptLanguage
    .split(',')
    .map(parseLanguagePreference)
    .filter((preference): preference is NonNullable<typeof preference> => !!preference)
    .sort((left, right) => right.quality - left.quality || left.index - right.index)

  for (const { range } of preferences) {
    // Lookup ignores "*" because it cannot identify a concrete site locale.
    if (range === '*')
      continue
    const locale = resolveSupportedLocale(range)
    if (locale)
      return locale
  }

  // A usable default is preferable to a 406 because every page exposes a language switcher.
  return defaultLocale
}

export function negotiateLocale(
  cookieValue: unknown,
  acceptLanguage: string | null | undefined,
): SupportedLocale {
  // An explicit choice outranks browser preferences, which are only a first-visit hint.
  return resolveLocalePreference(cookieValue) ?? getPreferredLocale(acceptLanguage)
}

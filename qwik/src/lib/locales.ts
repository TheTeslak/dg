export const supportedLocales = ['en', 'ru', 'es'] as const

export type SupportedLocale = (typeof supportedLocales)[number]

export const localeShortLabels: Record<SupportedLocale, string> = {
  en: 'EN',
  ru: 'RU',
  es: 'ES',
}

export const localeLabels: Record<SupportedLocale, string> = {
  en: 'English',
  ru: 'Russian',
  es: 'Spanish',
}

const localePrefixRE = /^\/(en|ru|es)(?=\/|$)/
export const localePreferenceKey = 'site-locale-pref'

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale)
}

export function getLocaleFromPath(pathname: string): SupportedLocale | null {
  const match = pathname.match(localePrefixRE)
  return (match?.[1] as SupportedLocale | undefined) ?? null
}

export function setPathLocale(
  pathname: string,
  locale: SupportedLocale,
  search = '',
  hash = '',
): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  let localizedPath = normalizedPath

  if (localePrefixRE.test(normalizedPath)) {
    localizedPath = normalizedPath.replace(localePrefixRE, `/${locale}`)
  }
  else if (normalizedPath === '/') {
    localizedPath = `/${locale}`
  }
  else {
    localizedPath = `/${locale}${normalizedPath}`
  }

  return `${localizedPath}${search}${hash}`
}

export function localeDateTag(locale: SupportedLocale): string {
  switch (locale) {
    case 'ru':
      return 'ru-RU'
    case 'es':
      return 'es-ES'
    default:
      return 'en-US'
  }
}

export function normalizeLocaleCandidate(
  value: string | null | undefined,
): SupportedLocale | null {
  if (!value)
    return null

  const match = value.toLowerCase().match(/[a-z]{2}/)
  if (!match)
    return null

  return isSupportedLocale(match[0]) ? match[0] : null
}

export function resolvePreferredLocale(
  ...candidates: Array<string | null | undefined>
): SupportedLocale {
  for (const candidate of candidates) {
    const normalized = normalizeLocaleCandidate(candidate)
    if (normalized)
      return normalized
  }

  return 'en'
}

export function getPreferredLocaleFromWindow(win: Window): SupportedLocale {
  const stored = normalizeLocaleCandidate(
    win.localStorage.getItem(localePreferenceKey),
  )
  if (stored)
    return stored

  return resolvePreferredLocale(
    ...(win.navigator.languages?.length
      ? win.navigator.languages
      : [win.navigator.language]),
  )
}

export function syncLocalePreference(locale: SupportedLocale): void {
  window.localStorage.setItem(localePreferenceKey, locale)
  document.cookie
    = `${localePreferenceKey}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`
}

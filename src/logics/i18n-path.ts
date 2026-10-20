import type { SupportedLocale } from '../locales/config'
import {
  defaultLocale,
  isSupportedLocale,
  localeSegmentPattern,
  supportedLocales,
} from '../locales/config'

export {
  defaultLocale,
  isSupportedLocale,
  supportedLocales,
}
export type { SupportedLocale } from '../locales/config'

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

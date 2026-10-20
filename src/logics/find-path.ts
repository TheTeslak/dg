import type { SupportedLocale } from '../locales/config.ts'
import { isSupportedLocale, localeSegmentPattern } from '../locales/config.ts'

const findRouteRE = new RegExp(`^/(${localeSegmentPattern})/finds/([^/]+)/?$`)

export function getFindPath(locale: SupportedLocale, slug: string) {
  return `/${locale}/finds/${slug}`
}

export function getFindIndexPath(locale: SupportedLocale) {
  return `/${locale}/finds`
}

export function getFindRouteInfo(path: string) {
  const match = path.match(findRouteRE)
  if (!match || !isSupportedLocale(match[1]))
    return undefined

  return {
    locale: match[1],
    slug: match[2],
  }
}

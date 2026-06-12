import type { SupportedLocale } from '../locales/config'
import { isSupportedLocale, localeSegmentPattern } from '../locales/config'

const articleRouteRE = new RegExp(`^/(${localeSegmentPattern})/([^/]+)/?$`)

export interface ArticleRouteInfo {
  locale: SupportedLocale
  slug: string
}

export function getArticlePath(locale: SupportedLocale, slug: string) {
  return `/${locale}/${slug}`
}

export function getArticleArchivePath(locale: SupportedLocale) {
  return `/${locale}/articles`
}

export function getArticleRouteInfo(path: string): ArticleRouteInfo | undefined {
  const match = path.match(articleRouteRE)
  if (!match || !isSupportedLocale(match[1]))
    return undefined

  return {
    locale: match[1],
    slug: match[2],
  }
}

export function getArticleSearchPath(
  physicalPath: string,
  servedLocales: readonly SupportedLocale[],
  siteLocale: SupportedLocale,
) {
  return servedLocales.includes(siteLocale)
    ? physicalPath.replace(articleRouteRE, `/${siteLocale}/$2`)
    : physicalPath
}

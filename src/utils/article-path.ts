import type { SupportedLocale } from '../locales/config.ts'
import { isSupportedLocale, localeSegmentPattern } from '../locales/config.ts'

const articleRouteRE = new RegExp(`^/(${localeSegmentPattern})/([^/]+)/?$`)

export interface ArticleRouteInfo {
  locale: SupportedLocale
  slug: string
}

/** Public article URLs live directly under the locale: `/{locale}/{slug}`. */
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

/**
 * Search results keep the reader in the current site locale whenever the
 * article is served there (physically or through a fallback alias).
 */
export function getArticleSearchPath(
  physicalPath: string,
  servedLocales: readonly SupportedLocale[],
  siteLocale: SupportedLocale,
) {
  return servedLocales.includes(siteLocale)
    ? physicalPath.replace(articleRouteRE, `/${siteLocale}/$2`)
    : physicalPath
}

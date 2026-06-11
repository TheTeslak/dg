const localeSegment = 'en|ru|es'
const articleRouteRE = new RegExp(`^/(${localeSegment})/([^/]+)/?$`)

export interface ArticleRouteInfo {
  locale: string
  slug: string
}

export function getArticlePath(locale: string, slug: string) {
  return `/${locale}/${slug}`
}

export function getArticleArchivePath(locale: string) {
  return `/${locale}/articles`
}

export function getArticleRouteInfo(path: string): ArticleRouteInfo | undefined {
  const match = path.match(articleRouteRE)
  if (!match)
    return undefined

  return {
    locale: match[1],
    slug: match[2],
  }
}

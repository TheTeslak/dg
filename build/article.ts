import { resolve } from 'node:path'
import fs from 'fs-extra'
import { supportedAudioExtensions, supportedLocales } from './constants'

export function getArticleInfo(id: string) {
  const match = id.match(/pages[\\/](?<locale>[a-z]{2})[\\/]articles[\\/](?<slug>[^/\\]+)\.md$/)
  if (!match?.groups)
    return
  return {
    sourceLocale: match.groups.locale,
    slug: match.groups.slug,
  }
}

export function isRealArticle(id: string) {
  const article = getArticleInfo(id)
  return !!article && article.slug !== 'index' && !article.slug.startsWith('[')
}

export function getAvailableArticleLocales(slug: string) {
  return supportedLocales.filter(locale =>
    fs.existsSync(resolve(__dirname, `../pages/${locale}/articles/${slug}.md`)),
  )
}

export function resolveAudioFile(locale: string, slug: string): string | undefined {
  for (const ext of supportedAudioExtensions) {
    const candidate = resolve(__dirname, `../public/audio/articles/${locale}/${slug}${ext}`)
    if (fs.existsSync(candidate))
      return `/audio/articles/${locale}/${slug}${ext}`
  }
  return undefined
}

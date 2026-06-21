/**
 * Article localization is based on physical files with matching slugs.
 * This module selects fallback sources; `vite.config.ts` turns them into route aliases.
 */
import type { SupportedLocale } from '../src/locales/config'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import matter from 'gray-matter'
import {
  articleFallbackLocale,
  isSupportedLocale,
  supportedLocales,
} from '../src/locales/config'
import { getArticlePath } from '../src/logics/article-path'
import { isPostIndexable, isPostRoutable, isPostVisible } from '../src/logics/post-visibility'
import { supportedAudioExtensions } from './constants'

const currentDir = dirname(fileURLToPath(import.meta.url))

export function getArticleInfo(id: string) {
  const match = id.match(/pages[\\/](?<locale>[^/\\]+)[\\/]articles[\\/](?<slug>[^/\\]+)\.md$/)
  if (!match?.groups || !isSupportedLocale(match.groups.locale))
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

export interface ArticleLocaleState {
  file: string
  indexable: boolean
  locale: SupportedLocale
  routable: boolean
  visible: boolean
}

export function getArticleLocaleStates(slug: string): ArticleLocaleState[] {
  // Matching filenames are the translation identity, avoiding duplicate YAML metadata.
  return supportedLocales.flatMap((locale) => {
    const file = resolve(currentDir, `../pages/${locale}/articles/${slug}.md`)
    if (!fs.existsSync(file))
      return []

    const { data } = matter(fs.readFileSync(file, 'utf-8'))
    return [{
      file,
      indexable: isPostIndexable(data),
      locale,
      routable: isPostRoutable(data),
      visible: isPostVisible(data),
    }]
  })
}

export function getArticleFallbackSource(
  targetLocale: SupportedLocale,
  routableLocales: readonly SupportedLocale[],
) {
  if (routableLocales.includes(targetLocale))
    return targetLocale

  // English is the shared fallback; any other fallback must be unambiguous.
  if (routableLocales.includes(articleFallbackLocale))
    return articleFallbackLocale
  if (routableLocales.length === 1)
    return routableLocales[0]
  if (routableLocales.length > 1) {
    throw new Error(
      `Ambiguous article fallback for "${targetLocale}": `
      + `${routableLocales.join(', ')} are available, but "${articleFallbackLocale}" is missing.`,
    )
  }
}

export function getArticleServedLocales(sourceLocale: SupportedLocale, slug: string) {
  const states = getArticleLocaleStates(slug)
  const physicalLocales = states.map(state => state.locale)
  const routableLocales = states
    .filter(state => state.routable)
    .map(state => state.locale)

  return supportedLocales.filter((targetLocale) => {
    if (targetLocale === sourceLocale)
      return true
    if (physicalLocales.includes(targetLocale))
      return false
    return getArticleFallbackSource(targetLocale, routableLocales) === sourceLocale
  })
}

export function getArticleFallbackPaths() {
  const slugs = new Set<string>()

  for (const locale of supportedLocales) {
    const articlesDir = resolve(currentDir, `../pages/${locale}/articles`)
    if (!fs.existsSync(articlesDir))
      continue

    for (const file of fs.readdirSync(articlesDir)) {
      if (file.endsWith('.md') && file !== 'index.md' && !file.startsWith('['))
        slugs.add(file.slice(0, -'.md'.length))
    }
  }

  return [...slugs].flatMap((slug) => {
    const states = getArticleLocaleStates(slug)
    const physicalLocales = states.map(state => state.locale)
    const routableLocales = states
      .filter(state => state.routable)
      .map(state => state.locale)
    return supportedLocales
      .filter(locale => !physicalLocales.includes(locale))
      .filter(locale => !!getArticleFallbackSource(locale, routableLocales))
      .map(locale => getArticlePath(locale, slug))
  })
}

export function resolveAudioFile(locale: string, slug: string): string | undefined {
  for (const ext of supportedAudioExtensions) {
    const candidate = resolve(currentDir, `../public/audio/articles/${locale}/${slug}${ext}`)
    if (fs.existsSync(candidate))
      return `/audio/articles/${locale}/${slug}${ext}`
  }
  return undefined
}

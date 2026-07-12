/**
 * Article localization is based on files with matching slugs across locale
 * folders (ported from dg `build/article.ts`). Pure functions over a generic
 * article list so both the Astro pages and the Node build scripts share the
 * exact same fallback semantics.
 */
import type { SupportedLocale } from '../locales/config.ts'
import { articleFallbackLocale, supportedLocales } from '../locales/config.ts'
import type { PostVisibilityFrontmatter } from './post-visibility.ts'
import { isPostIndexable, isPostRoutable, isPostVisible } from './post-visibility.ts'

export interface ArticleRef {
  locale: SupportedLocale
  slug: string
  data: PostVisibilityFrontmatter
}

export interface ArticleLocaleState {
  locale: SupportedLocale
  indexable: boolean
  routable: boolean
  visible: boolean
}

export type ArticleStatesBySlug = Map<string, ArticleLocaleState[]>

/** Matching slugs are the translation identity, avoiding duplicate YAML metadata. */
export function buildArticleStates(articles: readonly ArticleRef[]): ArticleStatesBySlug {
  const map: ArticleStatesBySlug = new Map()
  for (const article of articles) {
    if (!map.has(article.slug))
      map.set(article.slug, [])
    map.get(article.slug)!.push({
      locale: article.locale,
      indexable: isPostIndexable(article.data),
      routable: isPostRoutable(article.data),
      visible: isPostVisible(article.data),
    })
  }
  return map
}

export function getArticleFallbackSource(
  targetLocale: SupportedLocale,
  routableLocales: readonly SupportedLocale[],
): SupportedLocale | undefined {
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
  return undefined
}

/**
 * Locales where a physical translation is served, either as its own page or
 * through a fallback alias pointing at this source locale.
 */
export function getArticleServedLocales(
  sourceLocale: SupportedLocale,
  states: readonly ArticleLocaleState[],
): SupportedLocale[] {
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

/** Locales with an indexable physical translation (used for hreflang). */
export function getIndexableLocales(states: readonly ArticleLocaleState[]): SupportedLocale[] {
  return states.filter(state => state.indexable).map(state => state.locale)
}

/**
 * Fallback alias targets for a slug: locales without a physical file whose
 * unambiguous source exists. Hidden drafts never spread to other locales
 * because only routable (visible) translations participate.
 */
export function getFallbackTargets(states: readonly ArticleLocaleState[]): { target: SupportedLocale, source: SupportedLocale }[] {
  const physicalLocales = states.map(state => state.locale)
  const routableLocales = states
    .filter(state => state.routable)
    .map(state => state.locale)

  const targets: { target: SupportedLocale, source: SupportedLocale }[] = []
  for (const targetLocale of supportedLocales) {
    if (physicalLocales.includes(targetLocale))
      continue
    const source = getArticleFallbackSource(targetLocale, routableLocales)
    if (source)
      targets.push({ target: targetLocale, source })
  }
  return targets
}

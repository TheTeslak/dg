/**
 * Shared article loader for the Node build scripts (search index, feeds,
 * sitemap/robots). Reads the same content folder as Astro's collection and
 * applies the same normalization (visibility, reading time, excerpt, OG
 * fallback) by importing the exact modules the site uses — one semantics,
 * every consumer.
 */
import { basename } from 'node:path'
import fg from 'fast-glob'
import fs from 'fs-extra'
import matter from 'gray-matter'
import type { SupportedLocale } from '../../src/locales/config.ts'
import { supportedLocales } from '../../src/locales/config.ts'
import { getArticlePath } from '../../src/utils/article-path.ts'
import {
  buildArticleStates,
  getArticleServedLocales,
  getIndexableLocales,
  type ArticleStatesBySlug,
} from '../../src/utils/article-locales.ts'
import { estimateReadingMinutes, extractExcerpt } from '../../src/utils/content-cleanup.ts'

export interface ArticleFile {
  locale: SupportedLocale
  slug: string
  file: string
  data: Record<string, any>
  content: string
  path: string
  duration: number | null
  excerpt: string
  image?: string
  servedLocales: SupportedLocale[]
  availableLocales: SupportedLocale[]
}

function toDurationMinutes(duration: unknown): number | null {
  if (typeof duration === 'number' && Number.isFinite(duration))
    return Math.max(1, Math.round(duration))
  if (typeof duration === 'string') {
    const match = duration.trim().match(/^(\d+)(?:\s*min)?$/i)
    if (match)
      return Math.max(1, Number.parseInt(match[1], 10))
  }
  return null
}

export async function loadArticleFiles(): Promise<ArticleFile[]> {
  const raw: Omit<ArticleFile, 'servedLocales' | 'availableLocales'>[] = []

  for (const locale of supportedLocales) {
    const files = await fg(`src/content/articles/${locale}/*.md`)
    for (const file of files) {
      const filename = basename(file)
      if (filename === 'index.md' || filename.startsWith('['))
        continue
      const { data, content } = matter(await fs.readFile(file, 'utf-8'))
      const slug = filename.replace(/\.md$/, '')
      raw.push({
        locale,
        slug,
        file,
        data,
        content,
        path: getArticlePath(locale, slug),
        duration: toDurationMinutes(data.duration) ?? estimateReadingMinutes(content),
        excerpt: data.excerpt || extractExcerpt(content, 400),
        image: data.image || (data.title ? `/og/${slug}.png` : undefined),
      })
    }
  }

  const statesBySlug: ArticleStatesBySlug = buildArticleStates(raw)
  return raw.map((article) => {
    const states = statesBySlug.get(article.slug) ?? []
    return {
      ...article,
      servedLocales: getArticleServedLocales(article.locale, states),
      availableLocales: getIndexableLocales(states),
    }
  })
}

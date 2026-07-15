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
import { normalizeArticleContent } from '../../src/utils/article-normalization.ts'
import { getArticlePath } from '../../src/utils/article-path.ts'
import {
  buildArticleStates,
  getArticleServedLocales,
  getIndexableLocales,
  type ArticleStatesBySlug,
} from '../../src/utils/article-locales.ts'
import { articleSchema } from '../../src/utils/content-schema.ts'

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

export async function loadArticleFiles(): Promise<ArticleFile[]> {
  const raw: Omit<ArticleFile, 'servedLocales' | 'availableLocales'>[] = []

  for (const locale of supportedLocales) {
    const files = await fg(`src/content/articles/${locale}/*.md`)
    for (const file of files) {
      const filename = basename(file)
      if (filename === 'index.md' || filename.startsWith('['))
        continue
      const parsed = matter(await fs.readFile(file, 'utf-8'))
      const data = articleSchema.parse(parsed.data)
      const content = parsed.content
      const slug = filename.replace(/\.md$/, '')
      if (data.lang !== locale)
        throw new Error(`[frontmatter] ${file}: lang must match its "${locale}" directory.`)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
        throw new Error(`[frontmatter] ${file}: slug must be lowercase kebab-case.`)
      const normalized = normalizeArticleContent(data, content, slug)
      raw.push({
        locale,
        slug,
        file,
        data,
        content,
        path: getArticlePath(locale, slug),
        duration: normalized.duration ?? null,
        excerpt: normalized.excerpt || '',
        image: normalized.image,
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

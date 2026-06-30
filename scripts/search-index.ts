import type { AsPlainObject, Options } from 'minisearch'
import type { SupportedLocale } from '../src/locales/config'
import { resolve } from 'node:path'
import fg from 'fast-glob'
import fs from 'fs-extra'
import matter from 'gray-matter'
import MiniSearch from 'minisearch'
import { getArticleServedLocales } from '../build/article'
import { stripMarkdownForSearch } from '../build/content-cleanup'
import { normalizeFrontmatter } from '../build/frontmatter'
import { supportedLocales } from '../src/locales/config'
import { getArticlePath } from '../src/logics/article-path'
import { isPostVisible } from '../src/logics/post-visibility'

const MAX_BODY_LENGTH = 10_000
const SEARCH_OPTIONS: Options<SearchDocument> = {
  fields: ['title', 'description', 'tags', 'body'],
  storeFields: ['path', 'title', 'date', 'type', 'lang', 'duration', 'description', 'servedLocales'],
}

interface SearchDocument {
  id: string
  path: string
  title: string
  description: string
  body: string
  tags: string
  type: string
  date: string
  lang: string
  duration: number | null
  servedLocales: SupportedLocale[]
}

interface SearchIndexPayload {
  version: 1
  documents: SearchDocument[]
  index: AsPlainObject
}

function normalizeTags(rawTags: unknown): string {
  if (!rawTags)
    return ''
  if (Array.isArray(rawTags)) {
    return rawTags
      .filter((t): t is string => typeof t === 'string')
      .map(t => t.trim().replace(/^#+/, ''))
      .filter(Boolean)
      .join(' ')
  }
  return ''
}

function resolveType(rawType?: string): string {
  const type = rawType || 'blog'
  if (type.split('+').includes('note'))
    return 'note'
  return 'blog'
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

function toIsoDate(rawDate: unknown, filePath: string): string {
  if (!rawDate)
    return ''

  const date = new Date(rawDate as string | number | Date)
  if (Number.isNaN(date.getTime()))
    throw new Error(`[Search] Invalid date in ${filePath}: ${String(rawDate)}`)

  return date.toISOString()
}

async function buildSearchIndex() {
  const documents: SearchDocument[] = []

  for (const locale of supportedLocales) {
    const pattern = `pages/${locale}/articles/*.md`
    const files = await fg(pattern)

    for (const filePath of files) {
      // Skip index and catch-all routes
      const filename = filePath.split('/').pop() || ''
      if (filename === 'index.md' || filename.startsWith('['))
        continue

      const raw = await fs.readFile(filePath, 'utf-8')
      const { data, content } = matter(raw)
      const frontmatter = normalizeFrontmatter(data, content, filePath)

      // Skip invisible posts
      if (!isPostVisible(frontmatter))
        continue

      const slug = filename.replace(/\.md$/, '')
      const path = getArticlePath(locale, slug)
      const id = path.slice(1)

      const body = stripMarkdownForSearch(content).slice(0, MAX_BODY_LENGTH)

      documents.push({
        id,
        path,
        title: frontmatter.title || slug,
        description: frontmatter.description || frontmatter.excerpt || '',
        body,
        tags: normalizeTags(frontmatter.tags || frontmatter.hashtags),
        type: resolveType(frontmatter.type),
        date: toIsoDate(frontmatter.date, filePath),
        lang: frontmatter.lang || locale,
        duration: toDurationMinutes(frontmatter.duration),
        servedLocales: getArticleServedLocales(locale, slug),
      })
    }
  }

  // Each physical translation remains searchable; aliases only affect its destination URL.

  const miniSearch = new MiniSearch<SearchDocument>(SEARCH_OPTIONS)
  miniSearch.addAll(documents)

  const payload: SearchIndexPayload = {
    version: 1,
    documents,
    index: miniSearch.toJSON(),
  }

  const outputPath = resolve('public/search-index.json')
  await fs.writeJSON(outputPath, payload)

  const sizeKB = (JSON.stringify(payload).length / 1024).toFixed(1)
  console.log(`[Search] Generated build-time index: ${documents.length} documents, ${sizeKB} KB → public/search-index.json`)
}

buildSearchIndex()

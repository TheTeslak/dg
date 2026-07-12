import type { AsPlainObject, Options } from 'minisearch'
import { resolve } from 'node:path'
import fs from 'fs-extra'
import MiniSearch from 'minisearch'
import type { SupportedLocale } from '../src/locales/config.ts'
import { isPostVisible } from '../src/utils/post-visibility.ts'
import { stripMarkdownForSearch } from '../src/utils/content-cleanup.ts'
import { loadArticleFiles } from './lib/articles.ts'

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
  if (!Array.isArray(rawTags))
    return ''
  return rawTags
    .filter((t): t is string => typeof t === 'string')
    .map(t => t.trim().replace(/^#+/, ''))
    .filter(Boolean)
    .join(' ')
}

function resolveType(rawType?: string): string {
  const type = rawType || 'blog'
  return type.split('+').includes('note') ? 'note' : 'blog'
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
  const articles = await loadArticleFiles()
  const documents: SearchDocument[] = []

  for (const article of articles) {
    // Visible posts only; each physical translation stays searchable —
    // aliases just affect its destination URL (servedLocales).
    if (!isPostVisible(article.data))
      continue

    documents.push({
      id: article.path.slice(1),
      path: article.path,
      title: article.data.title || article.slug,
      description: article.data.description || article.excerpt || '',
      body: stripMarkdownForSearch(article.content).slice(0, MAX_BODY_LENGTH),
      tags: normalizeTags(article.data.tags || article.data.hashtags),
      type: resolveType(article.data.type),
      date: toIsoDate(article.data.date, article.file),
      lang: article.data.lang || article.locale,
      duration: article.duration,
      servedLocales: article.servedLocales,
    })
  }

  if (documents.length === 0) {
    console.error('[Search] No visible articles found — refusing to build an empty index. Is src/content/articles populated?')
    process.exit(1)
  }

  const miniSearch = new MiniSearch<SearchDocument>(SEARCH_OPTIONS)
  miniSearch.addAll(documents)

  const payload: SearchIndexPayload = {
    version: 1,
    documents,
    index: miniSearch.toJSON(),
  }

  const outputPath = resolve('public/search-index.json')
  await fs.ensureDir(resolve('public'))
  await fs.writeJSON(outputPath, payload)

  const sizeKB = (JSON.stringify(payload).length / 1024).toFixed(1)
  console.log(`[Search] Generated build-time index: ${documents.length} documents, ${sizeKB} KB → public/search-index.json`)
}

buildSearchIndex().catch((err) => {
  console.error(err)
  process.exit(1)
})

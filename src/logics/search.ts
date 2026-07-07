import type MiniSearch from 'minisearch'
import type { AsPlainObject, Options } from 'minisearch'
import type { Ref } from 'vue'
import type { SupportedLocale } from '~/locales/config'
import { useDebounceFn } from '@vueuse/core'
import { computed, ref, shallowRef, watch } from 'vue'
import { getArticleSearchPath } from '~/logics/article-path'
import { isSupportedLocale } from '~/logics/i18n-path'

export interface SearchDocument {
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

export interface SearchResult {
  path: string
  title: string
  highlightedTitle: string
  date: string
  type: string
  lang: string
  duration: number | null
  snippets: string[]
  score: number
}

interface SerializedSearchIndex {
  version: 1
  documents: SearchDocument[]
  index: AsPlainObject
}

// Shared reactive state — used by SubNav and page templates
export const isSearchOpen = ref(false)

// Internal state
const rawDocuments = shallowRef<SearchDocument[] | null>(null)
const miniSearchInstance = shallowRef<MiniSearch<SearchDocument> | null>(null)
const bodyById = shallowRef<Map<string, string> | null>(null)
const titleById = shallowRef<Map<string, string> | null>(null)
export const isLoading = ref(false)
export const searchQuery = ref('')
export const searchResults = shallowRef<SearchResult[]>([])

const MAX_SNIPPETS = 3
const SNIPPET_WINDOW = 120
const SEARCH_OPTIONS: Options<SearchDocument> = {
  fields: ['title', 'description', 'tags', 'body'],
  storeFields: ['path', 'title', 'date', 'type', 'lang', 'duration', 'description', 'servedLocales'],
}

interface SnippetRange {
  start: number
  end: number
  matchPos: number
}

/**
 * Find all occurrence positions of any search term in body text.
 */
function findAllOccurrences(body: string, terms: string[]): number[] {
  const lowerBody = body.toLowerCase()
  const positions: number[] = []

  for (const term of terms) {
    const lowerTerm = term.toLowerCase()
    let fromIndex = 0
    while (fromIndex < lowerBody.length) {
      const pos = lowerBody.indexOf(lowerTerm, fromIndex)
      if (pos === -1)
        break
      positions.push(pos)
      fromIndex = pos + lowerTerm.length
    }
  }

  return positions.sort((a, b) => a - b)
}

/**
 * Extract a text window around a position, snapping to word boundaries.
 */
function extractWindow(body: string, pos: number, windowSize: number): SnippetRange {
  const halfWindow = Math.floor(windowSize / 2)
  let start = Math.max(0, pos - halfWindow)
  let end = Math.min(body.length, pos + halfWindow)

  // Snap to word boundaries
  if (start > 0) {
    const spacePos = body.indexOf(' ', start)
    if (spacePos !== -1 && spacePos < pos)
      start = spacePos + 1
  }
  if (end < body.length) {
    const spacePos = body.lastIndexOf(' ', end)
    if (spacePos > pos)
      end = spacePos
  }

  return { start, end, matchPos: pos }
}

/**
 * Merge overlapping ranges into consolidated ranges.
 */
function mergeRanges(ranges: SnippetRange[]): SnippetRange[] {
  if (ranges.length === 0)
    return []

  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const merged: SnippetRange[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = sorted[i]
    if (curr.start <= prev.end + 10) {
      // Merge: extend the end, keep earliest matchPos
      prev.end = Math.max(prev.end, curr.end)
    }
    else {
      merged.push(curr)
    }
  }

  return merged
}

/**
 * Generate multiple snippet strings from body text around matched terms.
 * Returns up to MAX_SNIPPETS distinct fragments.
 */
function generateSnippets(body: string, terms: string[]): string[] {
  if (!body || terms.length === 0)
    return [body?.slice(0, SNIPPET_WINDOW) || '']

  const positions = findAllOccurrences(body, terms)
  if (positions.length === 0)
    return [body.slice(0, SNIPPET_WINDOW)]

  // Build windows around each unique position (deduplicate close ones)
  const ranges = positions.map(pos => extractWindow(body, pos, SNIPPET_WINDOW))
  const merged = mergeRanges(ranges).slice(0, MAX_SNIPPETS)

  return merged.map((range) => {
    let snippet = body.slice(range.start, range.end)
    if (range.start > 0)
      snippet = `…${snippet}`
    if (range.end < body.length)
      snippet = `${snippet}…`
    return snippet
  })
}

/**
 * Wrap matched terms in <mark> tags for highlighting.
 */
function highlightTerms(text: string, terms: string[]): string {
  if (!terms.length)
    return escapeHtml(text)

  // Escape HTML first, then apply highlighting
  const escaped = escapeHtml(text)

  // Build regex from terms, sorted by length (longest first to avoid partial matches)
  const sorted = [...terms].sort((a, b) => b.length - a.length)
  const pattern = sorted.map(t => escapeRegex(t)).join('|')
  const regex = new RegExp(`(${pattern})`, 'gi')

  return escaped.replace(regex, '<mark>$1</mark>')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getQueryTerms(query: string): string[] {
  return query.match(/[\p{L}\p{N}_]+/gu) || []
}

function hasExactWholeTerm(text: string, term: string): boolean {
  if (!term)
    return false

  try {
    const pattern = `(^|[^\\p{L}\\p{N}_])${escapeRegex(term)}(?=$|[^\\p{L}\\p{N}_])`
    return new RegExp(pattern, 'iu').test(text)
  }
  catch {
    return new RegExp(`\\b${escapeRegex(term)}\\b`, 'i').test(text)
  }
}

function getLocaleRank(
  lang: string,
  servedLocales: readonly SupportedLocale[],
  currentLocale: string,
) {
  if (!isSupportedLocale(currentLocale))
    return 0
  if (lang === currentLocale)
    return 0
  if (servedLocales.includes(currentLocale))
    return 1
  return 2
}

function isSerializedSearchIndex(payload: unknown): payload is SerializedSearchIndex {
  return !!payload
    && typeof payload === 'object'
    && (payload as SerializedSearchIndex).version === 1
    && Array.isArray((payload as SerializedSearchIndex).documents)
    && !!(payload as SerializedSearchIndex).index
}

async function loadIndex(): Promise<void> {
  if (rawDocuments.value || isLoading.value)
    return

  isLoading.value = true
  try {
    const response = await fetch('/search-index.json')
    const payload: unknown = await response.json()
    const { default: MiniSearch } = await import('minisearch')
    const docs: SearchDocument[] = isSerializedSearchIndex(payload)
      ? payload.documents
      : payload as SearchDocument[]

    rawDocuments.value = docs
    bodyById.value = new Map(docs.map(d => [d.id, d.body]))
    titleById.value = new Map(docs.map(d => [d.id, d.title]))

    if (isSerializedSearchIndex(payload)) {
      miniSearchInstance.value = MiniSearch.loadJS(payload.index, SEARCH_OPTIONS)
    }
    else {
      const ms = new MiniSearch<SearchDocument>(SEARCH_OPTIONS)
      ms.addAll(docs)
      miniSearchInstance.value = ms
    }
  }
  catch (err) {
    console.error('[Search] Failed to load search index:', err)
  }
  finally {
    isLoading.value = false
  }
}

function performSearch(query: string, currentLocale: string): SearchResult[] {
  const ms = miniSearchInstance.value
  const bodies = bodyById.value
  const titles = titleById.value
  if (!ms || !bodies || !titles || !query.trim())
    return []

  // Cache for exact-match checks per document (avoid repeated regex)
  const exactMatchCache = new Map<string, boolean>()
  const queryTerms = new Set(getQueryTerms(query).map(term => term.toLowerCase()))

  const results = ms.search(query, {
    boost: { title: 10, description: 5, tags: 3, body: 1 },
    prefix: true,
    fuzzy: 0.2,
    combineWith: 'AND',
    // Boost documents where the search term appears as an exact whole word.
    // Docs with only prefix matches (e.g. "searching" for query "search") are penalized.
    boostDocument: (docId, term) => {
      const cacheKey = `${docId}:${term}`
      if (!exactMatchCache.has(cacheKey)) {
        const body = bodies.get(String(docId)) || ''
        const title = titles.get(String(docId)) || ''
        const text = `${title} ${body}`
        const isExactQueryTerm = queryTerms.has(term.toLowerCase())
        exactMatchCache.set(cacheKey, isExactQueryTerm && hasExactWholeTerm(text, term))
      }
      return exactMatchCache.get(cacheKey) ? 1.0 : 0.6
    },
  })

  return results
    .map((result) => {
      // BUG FIX: Object.keys gives matched terms, Object.values gives field names
      const uniqueTerms = Object.keys(result.match)

      // Get body for multi-snippet generation
      const body = bodies.get(result.id) || ''
      const rawSnippets = generateSnippets(body, uniqueTerms)
      const snippets = rawSnippets.map(s => highlightTerms(s, uniqueTerms))

      // Highlight title
      const title = result.title as string
      const highlightedTitle = highlightTerms(title, uniqueTerms)

      const physicalPath = result.path as string
      const servedLocales = Array.isArray(result.servedLocales)
        ? result.servedLocales.filter(isSupportedLocale)
        : []
      const lang = result.lang as string
      const localeRank = getLocaleRank(lang, servedLocales, currentLocale)
      const path = isSupportedLocale(currentLocale)
        ? getArticleSearchPath(physicalPath, servedLocales, currentLocale)
        : physicalPath

      return {
        path,
        title,
        highlightedTitle,
        date: result.date as string,
        type: result.type as string,
        lang,
        duration: result.duration as number | null,
        snippets,
        score: result.score,
        localeRank,
      }
    })
    .sort((a, b) => a.localeRank - b.localeRank || b.score - a.score)
    .slice(0, 20)
    .map(({ localeRank: _localeRank, ...result }) => result)
}

export function useSearch(currentLocale: Ref<string>) {
  const debouncedSearch = useDebounceFn(() => {
    const query = searchQuery.value
    if (!query.trim()) {
      searchResults.value = []
      return
    }
    searchResults.value = performSearch(query, currentLocale.value)
  }, 200)

  watch(searchQuery, () => {
    debouncedSearch()
  })

  watch(currentLocale, () => {
    const query = searchQuery.value
    if (!query.trim()) {
      searchResults.value = []
      return
    }
    searchResults.value = performSearch(query, currentLocale.value)
  })

  // Auto-load index when search opens
  watch(isSearchOpen, async (open) => {
    if (open) {
      await loadIndex()
    }
    else {
      searchQuery.value = ''
      searchResults.value = []
    }
  })

  async function openSearch() {
    isSearchOpen.value = true
    await loadIndex()
  }

  function closeSearch() {
    isSearchOpen.value = false
  }

  const hasQuery = computed(() => searchQuery.value.trim().length > 0)

  return {
    isSearchOpen,
    isLoading,
    searchQuery,
    searchResults,
    hasQuery,
    openSearch,
    closeSearch,
  }
}

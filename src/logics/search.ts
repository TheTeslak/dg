import type { Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import MiniSearch from 'minisearch'
import { computed, ref, shallowRef, watch } from 'vue'

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

// Shared reactive state — used by SubNav and page templates
export const isSearchOpen = ref(false)

// Internal state
const rawDocuments = shallowRef<SearchDocument[] | null>(null)
const miniSearchInstance = shallowRef<MiniSearch | null>(null)
export const isLoading = ref(false)
export const searchQuery = ref('')
export const searchResults = shallowRef<SearchResult[]>([])

const MAX_SNIPPETS = 3
const SNIPPET_WINDOW = 120

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

async function loadIndex(): Promise<void> {
  if (rawDocuments.value || isLoading.value)
    return

  isLoading.value = true
  try {
    const response = await fetch('/search-index.json')
    const docs: SearchDocument[] = await response.json()
    rawDocuments.value = docs

    const ms = new MiniSearch<SearchDocument>({
      fields: ['title', 'description', 'tags', 'body'],
      storeFields: ['path', 'title', 'date', 'type', 'lang', 'duration', 'description'],
    })
    ms.addAll(docs)
    miniSearchInstance.value = ms
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
  const docs = rawDocuments.value
  if (!ms || !docs || !query.trim())
    return []

  const results = ms.search(query, {
    boost: { title: 10, description: 5, tags: 3, body: 1 },
    prefix: true,
    fuzzy: 0.2,
    combineWith: 'AND',
  })

  // Build a lookup map for body text (not stored in MiniSearch to save memory)
  const bodyMap = new Map(docs.map(d => [d.id, d.body]))

  return results
    .map((result) => {
      // BUG FIX: Object.keys gives matched terms, Object.values gives field names
      const uniqueTerms = Object.keys(result.match)

      // Get body for multi-snippet generation
      const body = bodyMap.get(result.id) || ''
      const rawSnippets = generateSnippets(body, uniqueTerms)
      const snippets = rawSnippets.map(s => highlightTerms(s, uniqueTerms))

      // Highlight title
      const title = result.title as string
      const highlightedTitle = highlightTerms(title, uniqueTerms)

      // Boost score for current locale
      const localBoost = result.lang === currentLocale ? 2 : 1
      const score = result.score * localBoost

      return {
        path: result.path as string,
        title,
        highlightedTitle,
        date: result.date as string,
        type: result.type as string,
        lang: result.lang as string,
        duration: result.duration as number | null,
        snippets,
        score,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20) // Limit to 20 results
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

  // Watch query changes
  watch(searchQuery, () => {
    debouncedSearch()
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

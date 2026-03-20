import { resolve } from 'node:path'
import fg from 'fast-glob'
import fs from 'fs-extra'
import matter from 'gray-matter'
import { isPostVisible } from '../src/logics/post-visibility'

const SUPPORTED_LOCALES = ['en', 'ru', 'es'] as const
const MAX_BODY_LENGTH = 10_000

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
}

/**
 * Strip markdown / HTML to plain text for search indexing.
 * Reuses the same cleanup logic as `extractExcerpt` in vite.config.ts
 * but without the length cap.
 */
function stripMarkdown(content: string): string {
  return content
    // Remove [[toc]] directives
    .replace(/\[\[toc\]\]/gi, '')
    // Remove code fences
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`[^`]*`/g, ' ')
    // Remove HTML tags and Vue components
    .replace(/<[^>]+>/g, ' ')
    // Remove images
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    // Convert links to just text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Remove headings markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquote markers
    .replace(/^>\s?/gm, '')
    // Remove horizontal rules
    .replace(/^-{3,}$/gm, '')
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Remove strikethrough
    .replace(/~~([^~]+)~~/g, '$1')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
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

async function buildSearchIndex() {
  const documents: SearchDocument[] = []

  for (const locale of SUPPORTED_LOCALES) {
    const pattern = `pages/${locale}/articles/*.md`
    const files = await fg(pattern)

    for (const filePath of files) {
      // Skip index and catch-all routes
      const filename = filePath.split('/').pop() || ''
      if (filename === 'index.md' || filename.startsWith('['))
        continue

      const raw = await fs.readFile(filePath, 'utf-8')
      const { data, content } = matter(raw)

      // Skip invisible posts
      if (!isPostVisible(data))
        continue

      const slug = filename.replace(/\.md$/, '')
      const id = `${locale}/articles/${slug}`
      const path = `/${locale}/articles/${slug}`

      const body = stripMarkdown(content).slice(0, MAX_BODY_LENGTH)

      documents.push({
        id,
        path,
        title: data.title || slug,
        description: data.description || data.excerpt || '',
        body,
        tags: normalizeTags(data.tags || data.hashtags),
        type: resolveType(data.type),
        date: data.date ? new Date(data.date).toISOString() : '',
        lang: data.lang || locale,
        duration: toDurationMinutes(data.duration),
      })
    }
  }

  // Deduplicate: if a slug exists in multiple locales, keep all (they are separate documents).
  // But if a slug exists only in 'en' and is aliased to other locales, we only have the 'en' file.
  // This is correct — the aliases point to the same content.

  const outputPath = resolve('public/search-index.json')
  await fs.writeJSON(outputPath, documents)

  const sizeKB = (JSON.stringify(documents).length / 1024).toFixed(1)
  console.log(`[Search] Generated index: ${documents.length} documents, ${sizeKB} KB → public/search-index.json`)
}

buildSearchIndex()

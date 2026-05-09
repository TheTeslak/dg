import { getArticleInfo, isRealArticle, resolveAudioFile } from './article'
import { audioMetadata, frontmatterKnownKeys } from './constants'

const frontmatterWarnings = new Set<string>()

export function warnFrontmatter(message: string) {
  if (frontmatterWarnings.has(message))
    return
  frontmatterWarnings.add(message)
  console.warn(message)
}

export function toDurationMinutes(duration: unknown): number | undefined {
  if (typeof duration === 'number' && Number.isFinite(duration))
    return Math.max(1, Math.round(duration))
  if (typeof duration === 'string') {
    const match = duration.trim().match(/^(\d+)(?:\s*min)?$/i)
    if (match)
      return Math.max(1, Number.parseInt(match[1], 10))
  }
  return undefined
}

export function estimateReadingMinutes(content: string): number {
  const noCodeFences = content.replace(/```[\s\S]*?```/g, ' ')
  const noInlineCode = noCodeFences.replace(/`[^`]*`/g, ' ')
  const noHtml = noInlineCode.replace(/<[^>]+>/g, ' ')
  const noLinks = noHtml
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

  const words = noLinks.match(/[a-z0-9\u0400-\u04FF]+(?:['\-][a-z0-9\u0400-\u04FF]+)*/gi)?.length || 0
  const cjkChars = noLinks.match(/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g)?.length || 0
  const units = words + cjkChars
  return Math.max(1, Math.ceil(units / 200))
}

export function extractExcerpt(content: string, maxLength: number): string {
  let text = content
    // Remove [[toc]] directives
    .replace(/\[\[toc\]\]/gi, '')
    // Remove code fences
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]*`/g, '')
    // Remove HTML tags and Vue components
    .replace(/<[^>]+>/g, '')
    // Remove images
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
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
    .replace(/\n{2,}/g, '\n')
    .trim()

  // Take first meaningful lines (skip empty)
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  text = lines.join(' ').trim()

  if (text.length > maxLength) {
    // Cut at last word boundary
    text = text.slice(0, maxLength)
    const lastSpace = text.lastIndexOf(' ')
    if (lastSpace > maxLength * 0.6)
      text = text.slice(0, lastSpace)
    text += '…'
  }

  return text
}

export function normalizeFrontmatter(rawFrontmatter: Record<string, any>, content: string, id: string) {
  const frontmatter = { ...rawFrontmatter }

  // Normalize date fields: gray-matter/js-yaml may parse ISO dates into
  // native Date objects.  Serialising a Date through route meta (SSG / SSR)
  // can produce "Invalid Date" strings.  Convert them to ISO strings early.
  for (const key of ['date', 'updated'] as const) {
    if (frontmatter[key] instanceof Date) {
      const d = frontmatter[key] as Date
      frontmatter[key] = Number.isNaN(d.getTime()) ? undefined : d.toISOString()
    }
  }

  if (frontmatter.hashtags && !frontmatter.tags) {
    frontmatter.tags = frontmatter.hashtags
    warnFrontmatter(`[frontmatter] ${id}: "hashtags" is deprecated, use "tags".`)
  }

  if (frontmatter.tags != null) {
    if (!Array.isArray(frontmatter.tags)) {
      warnFrontmatter(`[frontmatter] ${id}: "tags" should be an array of strings.`)
    }
    else {
      frontmatter.tags = frontmatter.tags
        .filter((item: unknown) => typeof item === 'string')
        .map((item: string) => item.trim().replace(/^#+/, ''))
        .filter(Boolean)
    }
  }

  if (frontmatter.duration != null) {
    const minutes = toDurationMinutes(frontmatter.duration)
    if (minutes != null)
      frontmatter.duration = minutes
    else
      warnFrontmatter(`[frontmatter] ${id}: unable to parse "duration" value "${String(frontmatter.duration)}".`)
  }
  else if (isRealArticle(id)) {
    frontmatter.duration = estimateReadingMinutes(content)
  }

  if (frontmatter.audio != null) {
    const article = getArticleInfo(id)

    // Shortcut: `audio: true` → resolve URL and metadata from cache / filesystem
    if (frontmatter.audio === true) {
      if (!article) {
        warnFrontmatter(`[frontmatter] ${id}: "audio: true" is only supported for articles.`)
        frontmatter.audio = undefined
      }
      else {
        const key = `${article.sourceLocale}/${article.slug}`
        const cached = audioMetadata[key]
        if (cached) {
          frontmatter.audio = {
            url: cached.url,
            duration: cached.duration,
          }
        }
        else {
          const audioUrl = resolveAudioFile(article.sourceLocale, article.slug)
          if (audioUrl) {
            frontmatter.audio = { url: audioUrl }
          }
          else {
            warnFrontmatter(`[frontmatter] ${id}: "audio: true" but no audio file found. Run "pnpm run process-audio".`)
            frontmatter.audio = undefined
          }
        }
      }
    }

    const audio = frontmatter.audio
    if (audio && typeof audio === 'object' && !Array.isArray(audio)) {
      // Inject cached duration when not set manually
      if (article && !audio.duration) {
        const key = `${article.sourceLocale}/${article.slug}`
        const cached = audioMetadata[key]
        if (cached?.duration)
          audio.duration = cached.duration
      }

      // Validate URL
      if (typeof audio.url !== 'string' || !audio.url.trim()) {
        warnFrontmatter(`[frontmatter] ${id}: "audio.url" should be a non-empty local path.`)
      }
      else if (/^https?:\/\//i.test(audio.url)) {
        warnFrontmatter(`[frontmatter] ${id}: "audio.url" should be a local path under /audio/articles/.`)
      }

      // Normalize sourceTextUpdatedAt Date
      if (audio.sourceTextUpdatedAt instanceof Date) {
        const d = audio.sourceTextUpdatedAt
        audio.sourceTextUpdatedAt = Number.isNaN(d.getTime()) ? undefined : d.toISOString()
      }
    }
    else if (audio != null) {
      warnFrontmatter(`[frontmatter] ${id}: "audio" should be "true" or an object with a "url" field.`)
    }
  }

  // Auto-generate excerpt from article body (first ~200 chars of clean text)
  if (!frontmatter.excerpt && content && isRealArticle(id)) {
    frontmatter.excerpt = extractExcerpt(content, 400)
  }

  for (const key of Object.keys(frontmatter)) {
    if (!frontmatterKnownKeys.has(key))
      warnFrontmatter(`[frontmatter] ${id}: unknown field "${key}".`)
  }

  return frontmatter
}

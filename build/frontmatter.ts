import { getArticleInfo, isRealArticle, resolveAudioFile } from './article'
import { audioMetadata, frontmatterKnownKeys } from './constants'
import { estimateReadingMinutes, extractExcerpt } from './content-cleanup'
import { isRealFind } from './find'

export { estimateReadingMinutes, extractExcerpt } from './content-cleanup'

const frontmatterWarnings = new Set<string>()
const futureDateWarningGraceMs = 24 * 60 * 60 * 1000

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

export function normalizeFrontmatter(rawFrontmatter: Record<string, any>, content: string, id: string) {
  const frontmatter = { ...rawFrontmatter }
  const isPublishedContent = isRealArticle(id) || isRealFind(id)

  // Normalize date fields: gray-matter/js-yaml may parse ISO dates into
  // native Date objects.  Serialising a Date through route meta (SSG / SSR)
  // can produce "Invalid Date" strings.  Convert them to ISO strings early.
  for (const key of ['date', 'updated'] as const) {
    if (frontmatter[key] instanceof Date) {
      const d = frontmatter[key] as Date
      frontmatter[key] = Number.isNaN(d.getTime()) ? undefined : d.toISOString()
    }
  }

  if (isPublishedContent && frontmatter.date) {
    const publishedAt = new Date(frontmatter.date)
    if (Number.isNaN(publishedAt.getTime())) {
      warnFrontmatter(`[frontmatter] ${id}: "date" is invalid.`)
    }
    // A full-day grace period avoids false alarms from author and build-server time zones.
    else if (publishedAt.getTime() > Date.now() + futureDateWarningGraceMs) {
      warnFrontmatter(
        `[frontmatter] ${id}: "date" is more than 24 hours in the future (${publishedAt.toISOString()}).`,
      )
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
  else if (isPublishedContent) {
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
        warnFrontmatter(`[frontmatter] ${id}: "audio.url" should be a local path under /audio/.`)
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
  if (!frontmatter.excerpt && content && isPublishedContent) {
    frontmatter.excerpt = extractExcerpt(content, 400)
  }

  for (const key of Object.keys(frontmatter)) {
    if (!frontmatterKnownKeys.has(key))
      warnFrontmatter(`[frontmatter] ${id}: unknown field "${key}".`)
  }

  return frontmatter
}

import { estimateReadingMinutes, extractExcerpt } from './content-cleanup.ts'

export function parseArticleDuration(duration: unknown): number | undefined {
  if (typeof duration === 'number' && Number.isFinite(duration))
    return Math.max(1, Math.round(duration))
  if (typeof duration === 'string') {
    const match = duration.trim().match(/^(\d+)(?:\s*min)?$/i)
    if (match)
      return Math.max(1, Number.parseInt(match[1], 10))
  }
  return undefined
}

export function normalizeArticleTags(data: Record<string, unknown>): string[] | undefined {
  const raw = data.tags ?? data.hashtags
  if (!Array.isArray(raw))
    return undefined
  const tags = raw
    .filter((tag): tag is string => typeof tag === 'string')
    .map(tag => tag.trim().replace(/^#+/, ''))
    .filter(Boolean)
  return tags.length ? tags : undefined
}

export function normalizeArticleContent(data: Record<string, any>, body: string, slug: string) {
  return {
    title: data.title || slug,
    duration: parseArticleDuration(data.duration) ?? (body ? estimateReadingMinutes(body) : undefined),
    excerpt: data.excerpt || (body ? extractExcerpt(body, 400) : undefined),
    image: data.image || (data.title ? `/og/${slug}.png` : undefined),
    tags: normalizeArticleTags(data),
  }
}

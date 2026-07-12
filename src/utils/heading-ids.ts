import { slugify } from './slugify.ts'

/**
 * Deterministic heading-id assignment shared by the TOC (remark) and the
 * heading `id` attributes (rehype). Both passes walk headings in document
 * order, so running the same uniquifier on both sides guarantees the TOC
 * hrefs always match the rendered ids — a single source of truth, like the
 * `markdown-it-anchor` + TOC pairing in the original project.
 */
export function createHeadingIdFactory() {
  const seen = new Map<string, number>()
  return function headingId(text: string): string {
    const base = slugify(text) || 'heading'
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
  }
}

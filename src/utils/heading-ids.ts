import { slugify } from './slugify.ts'

/**
 * Deterministic heading-id assignment used by the final HAST heading/TOC pass.
 * Keeping the uniquifier here also makes the legacy fragment format explicit
 * and independently testable.
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

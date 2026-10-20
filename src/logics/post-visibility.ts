export interface PostVisibilityFrontmatter {
  date?: string | Date
  draft?: boolean
  robots?: string
  type?: string
}

export function isDraftPost(type?: string): boolean {
  if (!type)
    return false
  return type.split('+').includes('draft')
}

export function isClipPost(type?: string): boolean {
  if (!type)
    return false
  const types = type.split('+')
  return types.includes('clip') || types.includes('clipping')
}

export function isHiddenPost(type?: string): boolean {
  if (!type)
    return false
  const types = type.split('+')
  return types.includes('hidden')
}

export function hasNoindexRobots(robots?: string): boolean {
  return typeof robots === 'string'
    && robots.split(',').some(directive => directive.trim().toLowerCase() === 'noindex')
}

/**
 * Returns true if the post should appear in public lists and navigation.
 * Hidden: posts without a date, posts with `draft: true` flag, posts where
 * "draft" or "hidden" is the only type (e.g. type: "draft" or type: "hidden").
 * Visible with 🚧 indicator: combined types like "note+draft" or "blog+draft".
 */
export function isPostVisible(frontmatter: PostVisibilityFrontmatter): boolean {
  if (!frontmatter.date)
    return false
  if (frontmatter.draft)
    return false
  const types = (frontmatter.type || '').split('+').filter(Boolean)
  if (types.length === 1 && (types[0] === 'draft' || types[0] === 'hidden'))
    return false
  return true
}

export function isPostRoutable(frontmatter: PostVisibilityFrontmatter): boolean {
  // Hidden drafts and hidden posts keep their physical preview URL but must not spread to every site locale.
  return isPostVisible(frontmatter)
}

/**
 * Returns true if the post is eligible for search indexing, sitemap and feeds.
 * Draft, clip and hidden status protects work from distribution without removing its public URL.
 */
export function isPostIndexable(frontmatter: PostVisibilityFrontmatter): boolean {
  return isPostVisible(frontmatter)
    && !isDraftPost(frontmatter.type)
    && !isClipPost(frontmatter.type)
    && !isHiddenPost(frontmatter.type)
    && !hasNoindexRobots(frontmatter.robots)
}

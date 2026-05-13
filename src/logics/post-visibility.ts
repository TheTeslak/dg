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

export function hasNoindexRobots(robots?: string): boolean {
  return typeof robots === 'string'
    && robots.split(',').some(directive => directive.trim().toLowerCase() === 'noindex')
}

/**
 * Returns true if the post should appear in public lists and navigation.
 * Hidden: posts without a date, posts with `draft: true` flag, posts where
 * "draft" is the only type (e.g. type: "draft").
 * Visible with 🚧 indicator: combined types like "note+draft" or "blog+draft".
 */
export function isPostVisible(frontmatter: PostVisibilityFrontmatter): boolean {
  if (!frontmatter.date)
    return false
  if (frontmatter.draft)
    return false
  const types = (frontmatter.type || '').split('+').filter(Boolean)
  if (types.length === 1 && types[0] === 'draft')
    return false
  return true
}

/**
 * Returns true if the post is eligible for search indexing, sitemap and feeds.
 * Combined draft types remain visible in the UI, but should not be indexed.
 */
export function isPostIndexable(frontmatter: PostVisibilityFrontmatter): boolean {
  return isPostVisible(frontmatter)
    && !isDraftPost(frontmatter.type)
    && !hasNoindexRobots(frontmatter.robots)
}

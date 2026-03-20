export interface PostVisibilityFrontmatter {
  date?: string | Date
  draft?: boolean
  type?: string
}

export function isDraftPost(type?: string): boolean {
  if (!type)
    return false
  return type.split('+').includes('draft')
}

/**
 * Returns true if the post should appear in public lists, navigation and RSS.
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

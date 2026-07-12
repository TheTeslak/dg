import type { Plugin } from 'unified'
import type { Element, Root } from 'hast'
import { toString } from 'hast-util-to-string'
import { visit } from 'unist-util-visit'
import { createHeadingIdFactory } from './heading-ids.ts'

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

/**
 * Assigns heading ids with the site's own slugify (ported verbatim from dg's
 * `scripts/slugify.ts`) instead of `rehype-slug`/github-slugger, so legacy
 * `#fragment` deep links keep working and TOC links always resolve.
 */
const rehypeHeadingIds: Plugin<[], Root> = () => {
  return (tree) => {
    const headingId = createHeadingIdFactory()
    visit(tree, 'element', (node: Element) => {
      if (!HEADING_TAGS.has(node.tagName))
        return
      node.properties = node.properties || {}
      if (!node.properties.id)
        node.properties.id = headingId(toString(node))
    })
  }
}

export default rehypeHeadingIds

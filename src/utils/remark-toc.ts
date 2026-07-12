import type { Plugin } from 'unified'
import type { Root, Heading, Paragraph, Parent } from 'mdast'
import { visit } from 'unist-util-visit'
import { toString } from 'mdast-util-to-string'
import { createHeadingIdFactory } from './heading-ids.ts'

interface HeadingItem {
  depth: number
  text: string
  id: string
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case '\'': return '&#39;'
      default: return c
    }
  })
}

/** Builds the nested <ul> markup markdown-it-table-of-contents produces. */
function buildList(items: HeadingItem[], start: number, depth: number): { html: string, next: number } {
  let html = '<ul>'
  let i = start
  while (i < items.length && items[i].depth >= depth) {
    if (items[i].depth === depth) {
      html += `<li><a href="#${escapeHtml(items[i].id)}">${escapeHtml(items[i].text)}</a>`
      i++
      if (i < items.length && items[i].depth > depth) {
        const nested = buildList(items, i, items[i].depth)
        html += nested.html
        i = nested.next
      }
      html += '</li>'
    }
    else {
      const nested = buildList(items, i, items[i].depth)
      html += `<li>${nested.html}</li>`
      i = nested.next
    }
  }
  return { html: `${html}</ul>`, next: i }
}

/**
 * Replaces stand-alone `[[toc]]` paragraphs with a nested HTML list of the
 * page headings (depths 1-4), mirroring the `markdown-it-table-of-contents`
 * output used by the original dg project. Heading ids come from the same
 * factory as `rehype-heading-ids`, so TOC links always match rendered ids.
 */
const remarkToc: Plugin<[], Root> = () => {
  return (tree) => {
    const headingId = createHeadingIdFactory()
    const headings: HeadingItem[] = []
    visit(tree, 'heading', (node: Heading) => {
      const text = toString(node)
      headings.push({ depth: node.depth, text, id: headingId(text) })
    })

    visit(tree, 'paragraph', (node: Paragraph, index, parent: Parent | undefined) => {
      if (!parent || typeof index !== 'number')
        return
      const isTocParagraph
        = node.children.length === 1
        && node.children[0].type === 'text'
        && node.children[0].value.trim().toLowerCase() === '[[toc]]'
      if (!isTocParagraph)
        return

      const items = headings.filter(h => h.depth <= 4)
      if (items.length === 0) {
        parent.children.splice(index, 1)
        return index
      }

      let html = '<div class="table-of-contents">'
      html += '<div class="table-of-contents-anchor"><div class="i-ri-menu-2-fill" aria-hidden="true"></div></div>'
      html += buildList(items, 0, Math.min(...items.map(h => h.depth))).html
      html += '</div>'

      parent.children.splice(index, 1, { type: 'html', value: html })
      return index + 1
    })
  }
}

export default remarkToc

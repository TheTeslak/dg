import type { Element, ElementContent, Root, RootContent } from 'hast'
import type { Plugin } from 'unified'
import { toString } from 'hast-util-to-string'
import { visit } from 'unist-util-visit'
import { createHeadingIdFactory } from './heading-ids.ts'

interface Options {
  permalinks?: boolean
  toc?: boolean
}

interface HeadingItem {
  depth: number
  id: string
  text: string
}

const HEADING_RE = /^h([1-6])$/

function element(tagName: string, properties: Element['properties'] = {}, children: ElementContent[] = []): Element {
  return { type: 'element', tagName, properties, children }
}

function buildList(items: HeadingItem[], start: number, depth: number): { list: Element, next: number } {
  const children: ElementContent[] = []
  let index = start

  while (index < items.length && items[index].depth >= depth) {
    if (items[index].depth === depth) {
      const item = items[index]
      const listItemChildren: ElementContent[] = [
        element('a', { href: `#${item.id}` }, [{ type: 'text', value: item.text }]),
      ]
      index += 1
      if (index < items.length && items[index].depth > depth) {
        const nested = buildList(items, index, items[index].depth)
        listItemChildren.push(nested.list)
        index = nested.next
      }
      children.push(element('li', {}, listItemChildren))
    }
    else {
      const nested = buildList(items, index, items[index].depth)
      children.push(element('li', {}, [nested.list]))
      index = nested.next
    }
  }

  return { list: element('ul', {}, children), next: index }
}

function tocNode(items: HeadingItem[]): Element {
  const startDepth = Math.min(...items.map(item => item.depth))
  return element('div', { className: ['table-of-contents'] }, [
    element('div', { className: ['table-of-contents-anchor'] }, [
      element('div', { className: ['i-ri-menu-2-fill'], ariaHidden: 'true' }),
    ]),
    buildList(items, 0, startDepth).list,
  ])
}

/**
 * Assign heading ids and build the authored [[toc]] from the same final HAST
 * nodes. This keeps ids, visible labels, raw HTML, and custom inline syntax in
 * one representation instead of replaying slug generation across remark and
 * rehype phases.
 */
const rehypeHeadingsToc: Plugin<[Options?], Root> = (options = {}) => {
  const includePermalinks = options.permalinks !== false
  const includeToc = options.toc !== false

  return (tree, file) => {
    const headingId = createHeadingIdFactory()
    const headings: HeadingItem[] = []
    const usedIds = new Set<string>()

    visit(tree, 'element', (node: Element) => {
      const match = node.tagName.match(HEADING_RE)
      if (!match)
        return

      const text = toString(node)
      const authoredId = typeof node.properties?.id === 'string' && node.properties.id
        ? node.properties.id
        : undefined
      if (authoredId && usedIds.has(authoredId))
        file.fail(`duplicate heading id "${authoredId}".`, node)

      let id = authoredId
      while (!id || usedIds.has(id))
        id = headingId(text)
      usedIds.add(id)
      node.properties ||= {}
      node.properties.id = id
      headings.push({ depth: Number(match[1]), id, text })

      if (includePermalinks) {
        node.children.push(element('a', {
          className: ['header-anchor'],
          href: `#${id}`,
          ariaHidden: 'true',
          tabIndex: -1,
        }))
      }
    })

    const tocItems = headings.filter(heading => heading.depth <= 4)
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'p' || !parent || typeof index !== 'number')
        return
      if (toString(node).trim().toLowerCase() !== '[[toc]]')
        return

      const replacement: RootContent[] = includeToc && tocItems.length
        ? [tocNode(tocItems)]
        : []
      parent.children.splice(index, 1, ...replacement)
      return index + replacement.length
    })
  }
}

export default rehypeHeadingsToc

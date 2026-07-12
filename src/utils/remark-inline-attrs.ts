import type { Plugin } from 'unified'
import type { Parent, PhrasingContent, Root, Text } from 'mdast'
import { visit } from 'unist-util-visit'

/**
 * Djot-inspired inline attribute spans, a faithful port of dg's markdown-it
 * inline rules (`mutedSpanPlugin` / `glossaryTermPlugin`):
 *
 * - `[text]{.muted}` → `<span class="muted">text</span>`
 * - `[text]{term="Term" definition="Definition"}` → an interactive glossary
 *   term (margin note / bottom sheet behavior in scripts/glossary.ts).
 *
 * Like the original inline rules, the visible text keeps its inline
 * markdown: the wrapped content may span multiple phrasing nodes
 * (emphasis, links, code), so the span is emitted as html open/close
 * markers around the original children instead of flattening to plain text.
 * Only these two forms are supported intentionally; this is not a general
 * attributes parser.
 */
const attrPairRE = /(\w[\w-]*)\s*=\s*"([^"]*)"/g

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

function openTagFor(attrs: string): string | undefined {
  if (attrs.trim() === '.muted')
    return '<span class="muted">'

  const pairs = new Map<string, string>()
  attrPairRE.lastIndex = 0
  let pair: RegExpExecArray | null
  while ((pair = attrPairRE.exec(attrs)) !== null)
    pairs.set(pair[1], pair[2])

  const term = pairs.get('term')
  const definition = pairs.get('definition')
  if (term && definition) {
    return `<span class="glossary-term" data-glossary-term data-term="${escapeHtml(term)}" data-definition="${escapeHtml(definition)}" tabindex="0" role="button" aria-label="${escapeHtml(term)}" aria-expanded="false" aria-haspopup="dialog">`
  }

  return undefined
}

interface OpenMatch {
  /** Index of the child containing `[`. */
  childIndex: number
  /** Offset of `[` inside that text node. */
  offset: number
}

/**
 * Scans a parent's children for `[` ... `]{attrs}` where the opening bracket
 * and the attribute suffix may live in different text nodes, keeping every
 * parsed inline node in between.
 */
function transformParent(parent: Parent): boolean {
  const children = parent.children as PhrasingContent[]
  let changed = false

  for (let close = 0; close < children.length; close++) {
    const closeNode = children[close]
    if (closeNode.type !== 'text' || !closeNode.value.includes(']{'))
      continue

    const closeMatch = closeNode.value.match(/\]\{([^}\n]+)\}/)
    if (!closeMatch || closeMatch.index === undefined)
      continue
    const openTag = openTagFor(closeMatch[1])
    if (!openTag)
      continue

    // Find the matching `[`: search backwards from the close position,
    // first inside the same text node, then in earlier text siblings.
    let open: OpenMatch | undefined
    const sameNodePrefix = closeNode.value.slice(0, closeMatch.index)
    const sameNodeBracket = sameNodePrefix.lastIndexOf('[')
    if (sameNodeBracket !== -1 && !sameNodePrefix.slice(sameNodeBracket).includes(']')) {
      open = { childIndex: close, offset: sameNodeBracket }
    }
    else {
      for (let i = close - 1; i >= 0; i--) {
        const candidate = children[i]
        if (candidate.type !== 'text')
          continue
        const bracket = candidate.value.lastIndexOf('[')
        if (bracket === -1)
          continue
        if (candidate.value.slice(bracket + 1).includes(']'))
          break
        open = { childIndex: i, offset: bracket }
        break
      }
    }
    if (!open)
      continue

    // --- Build the replacement sequence ---
    const replacement: PhrasingContent[] = []
    const openNode = children[open.childIndex] as Text

    // Text before `[` stays as-is.
    if (open.offset > 0)
      replacement.push({ type: 'text', value: openNode.value.slice(0, open.offset) })

    replacement.push({ type: 'html', value: openTag })

    if (open.childIndex === close) {
      // `[text]{...}` fully inside one text node.
      const inner = closeNode.value.slice(open.offset + 1, closeMatch.index)
      if (inner)
        replacement.push({ type: 'text', value: inner })
    }
    else {
      // Rest of the opening node after `[`.
      const innerLead = openNode.value.slice(open.offset + 1)
      if (innerLead)
        replacement.push({ type: 'text', value: innerLead })
      // All parsed inline nodes between the brackets survive untouched.
      for (let i = open.childIndex + 1; i < close; i++)
        replacement.push(children[i])
      // Text of the closing node before `]{`.
      const innerTail = closeNode.value.slice(0, closeMatch.index)
      if (innerTail)
        replacement.push({ type: 'text', value: innerTail })
    }

    replacement.push({ type: 'html', value: '</span>' })

    const tail = closeNode.value.slice(closeMatch.index + closeMatch[0].length)
    if (tail)
      replacement.push({ type: 'text', value: tail })

    children.splice(open.childIndex, close - open.childIndex + 1, ...replacement)
    changed = true
    // Re-scan the same region for further spans.
    close = open.childIndex
  }

  return changed
}

const remarkInlineAttrs: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, ['paragraph', 'heading', 'listItem', 'tableCell'], (node) => {
      transformParent(node as Parent)
    })
  }
}

export default remarkInlineAttrs

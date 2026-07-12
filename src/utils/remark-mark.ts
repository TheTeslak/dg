import type { Plugin } from 'unified'
import type { Root, Text, Parent, PhrasingContent } from 'mdast'
import { visit } from 'unist-util-visit'

const MARK_RE = /==([^=]+)==/g

const remarkMark: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent: Parent | undefined) => {
      if (!parent || typeof index !== 'number')
        return
      const value = node.value
      if (!value.includes('=='))
        return

      const result: PhrasingContent[] = []
      let lastIndex = 0
      let match: RegExpExecArray | null
      MARK_RE.lastIndex = 0

      while ((match = MARK_RE.exec(value)) !== null) {
        if (match.index > lastIndex) {
          result.push({ type: 'text', value: value.slice(lastIndex, match.index) })
        }
        result.push({
          type: 'html',
          value: `<mark>${escapeHtml(match[1])}</mark>`,
        })
        lastIndex = match.index + match[0].length
      }

      if (result.length === 0)
        return

      if (lastIndex < value.length) {
        result.push({ type: 'text', value: value.slice(lastIndex) })
      }

      parent.children.splice(index, 1, ...result)
      return index + result.length
    })
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#39;'
      default: return c
    }
  })
}

export default remarkMark

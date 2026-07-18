import type { Root, Text } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

const suspiciousInlineAttributeRE = /(?:\]\{[^}\n]{0,160}(?:\}|$)|\[[^\]\n]{0,120}(?:\[\{[^}\n]{0,160}(?:\}|$)|\{[.#][^}\n]{0,80}(?:\}|$)))/g

const remarkAttrDiagnostics: Plugin<[], Root> = () => {
  return (tree, file) => {
    visit(tree, 'text', (node: Text) => {
      const match = suspiciousInlineAttributeRE.exec(node.value)
      suspiciousInlineAttributeRE.lastIndex = 0
      if (!match)
        return
      file.fail(`possible malformed inline attribute syntax "${match[0]}". Use [text]{.muted} or [text]{term="Term" definition="Definition"}.`, node)
    })
  }
}

export default remarkAttrDiagnostics

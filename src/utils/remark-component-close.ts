import type { Plugin } from 'unified'
import type { Root } from 'mdast'
import { visit } from 'unist-util-visit'

/**
 * HTML parsers treat self-closing syntax on unknown elements as a plain open
 * tag, so `<TextCopy value="…" />` would swallow the rest of the document
 * once `rehype-raw` runs. This pass rewrites self-closing *component* tags
 * (uppercase first letter — never void HTML elements like `<br/>`) into an
 * explicit open+close pair before the HTML is parsed.
 */
const selfClosingComponentRE = /<([A-Z][\w.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)\/>/g

const remarkComponentClose: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'html', (node: { value: string }) => {
      if (node.value.includes('/>'))
        node.value = node.value.replace(selfClosingComponentRE, '<$1$2></$1>')
    })
  }
}

export default remarkComponentClose

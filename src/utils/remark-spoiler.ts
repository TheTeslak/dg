import type { Plugin } from 'unified'
import type { Paragraph, Root, RootContent, Text } from 'mdast'

/**
 * Djot-inspired spoiler block (ported from dg `build/markdown-plugins.ts`,
 * which parsed line-by-line like markdown-it). Both authoring styles work:
 *
 *   ::: spoiler Title          ::: spoiler Title
 *                              content on the next line
 *   ...blocks...               :::
 *
 *   :::
 *
 * The opening/closing markers may share a paragraph with the content
 * (no blank lines), so this pass splits marker lines out of paragraph
 * text nodes instead of requiring standalone paragraphs.
 */
const openRE = /^:{3,}\s*spoiler\b(.*)$/
const closeRE = /^:{3,}\s*$/

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

function spoilerOpenHtml(title: string): RootContent {
  return {
    type: 'html',
    value: [
      '<details class="spoiler">',
      '<summary class="spoiler-summary">',
      '<span class="spoiler-arrow i-ri-arrow-right-s-line" aria-hidden="true"></span>',
      `<span>${escapeHtml(title || 'Spoiler')}</span>`,
      '</summary>',
      '<div class="spoiler-content">',
    ].join(''),
  }
}

const spoilerCloseHtml = (): RootContent => ({
  type: 'html',
  value: '</div></details>',
})

function firstTextNode(paragraph: Paragraph): Text | undefined {
  const first = paragraph.children[0]
  return first?.type === 'text' ? first : undefined
}

function lastTextNode(paragraph: Paragraph): Text | undefined {
  const last = paragraph.children[paragraph.children.length - 1]
  return last?.type === 'text' ? last : undefined
}

/** Matches an opening marker on the first line of a paragraph; strips it. */
function extractOpenMarker(paragraph: Paragraph): string | undefined {
  const textNode = firstTextNode(paragraph)
  if (!textNode)
    return undefined
  const newline = textNode.value.indexOf('\n')
  const firstLine = newline === -1 ? textNode.value : textNode.value.slice(0, newline)
  const match = firstLine.trim().match(openRE)
  if (!match)
    return undefined

  if (newline === -1) {
    // Marker is the entire text node — drop it (and a following break).
    paragraph.children.shift()
    while (paragraph.children[0]?.type === 'break')
      paragraph.children.shift()
  }
  else {
    textNode.value = textNode.value.slice(newline + 1)
  }
  return match[1].trim()
}

/** Matches a closing marker on the last line of a paragraph; strips it. */
function extractCloseMarker(paragraph: Paragraph): boolean {
  const textNode = lastTextNode(paragraph)
  if (!textNode)
    return false
  const newline = textNode.value.lastIndexOf('\n')
  const lastLine = newline === -1 ? textNode.value : textNode.value.slice(newline + 1)
  if (!closeRE.test(lastLine.trim()))
    return false

  if (newline === -1) {
    paragraph.children.pop()
    while (paragraph.children[paragraph.children.length - 1]?.type === 'break')
      paragraph.children.pop()
  }
  else {
    textNode.value = textNode.value.slice(0, newline)
  }
  return true
}

const remarkSpoiler: Plugin<[], Root> = () => {
  return (tree, file) => {
    const children = tree.children

    for (let i = 0; i < children.length; i++) {
      const node = children[i]
      if (node.type !== 'paragraph')
        continue

      const title = extractOpenMarker(node)
      if (title === undefined)
        continue

      // Find the closing marker starting from this very paragraph
      // (compact form) through the following blocks.
      let closeIndex = -1
      let closesInSameParagraph = false
      for (let j = i; j < children.length; j++) {
        const candidate = children[j]
        if (candidate.type !== 'paragraph')
          continue
        if (j === i) {
          if (extractCloseMarker(candidate)) {
            closeIndex = j
            closesInSameParagraph = true
            break
          }
          continue
        }
        if (extractCloseMarker(candidate)) {
          closeIndex = j
          break
        }
      }

      if (closeIndex === -1) {
        console.warn(`[markdown] ${file?.path ?? ''}: unclosed spoiler block.`)
        continue
      }

      const closeTarget = children[closeIndex] as Paragraph
      const removeClose = !closesInSameParagraph && closeTarget.children.length === 0
      const removeOpen = (children[i] as Paragraph).children.length === 0

      // Insert close marker after the closing paragraph (or in its place
      // when the paragraph became empty).
      if (removeClose)
        children.splice(closeIndex, 1, spoilerCloseHtml())
      else
        children.splice(closeIndex + 1, 0, spoilerCloseHtml())

      // Insert open marker before the opening paragraph (or in its place).
      if (removeOpen && !closesInSameParagraph)
        children.splice(i, 1, spoilerOpenHtml(title))
      else
        children.splice(i, 0, spoilerOpenHtml(title))

      i = closeIndex + 1
    }
  }
}

export default remarkSpoiler

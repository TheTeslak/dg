import type { Plugin } from 'unified'
import type { Root, Element, Parent } from 'hast'
import { visit } from 'unist-util-visit'

/**
 * Image authoring contract:
 *
 *   ![Useful screen-reader description](/image.avif "Visible caption")
 *   ![Useful screen-reader description | wide](/image.avif "Visible caption")
 *
 * Alt text and the optional visible caption deliberately have separate jobs.
 * Omitting the Markdown title means there is no caption; there is no inverse
 * `no-caption` flag. `wide` is the only supported layout modifier.
 */
const rehypeImageFigures: Plugin<[], Root> = () => {
  return (tree) => {
    let imageCount = 0

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img')
        return
      imageCount += 1
      const props = (node.properties ||= {})
      if (!('decoding' in props))
        props.decoding = 'async'
      if (!('loading' in props) && imageCount > 1)
        props.loading = 'lazy'
    })

    visit(tree, 'element', (node: Element, index, parent: Parent | undefined) => {
      if (node.tagName !== 'p')
        return
      if (!parent || typeof index !== 'number')
        return
      const childElements = node.children.filter((c: any) => c.type === 'element') as Element[]
      const childText = node.children.filter((c: any) => c.type === 'text')
      const onlyImage = childElements.length === 1 && childElements[0].tagName === 'img'
      const noText = childText.every((t: any) => !('value' in t) || !String(t.value).trim())
      if (!onlyImage || !noText)
        return

      const img = childElements[0]
      const rawAlt = typeof img.properties?.alt === 'string' ? img.properties.alt.trim() : ''
      const altParts = rawAlt.split('|').map(part => part.trim()).filter(Boolean)
      const alt = altParts[0] || ''
      const wide = altParts.slice(1).includes('wide')
      const caption = typeof img.properties?.title === 'string' ? img.properties.title.trim() : ''
      img.properties ||= {}
      img.properties.alt = alt
      delete img.properties.title
      const figureChildren: Element[] = [img]
      if (caption) {
        figureChildren.push({
          type: 'element',
          tagName: 'figcaption',
          properties: {},
          children: [{ type: 'text', value: caption }],
        })
      }
      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: wide ? { className: ['img-wide'] } : {},
        children: figureChildren,
      }
      parent.children.splice(index, 1, figure)
      return index + 1
    })
  }
}

export default rehypeImageFigures

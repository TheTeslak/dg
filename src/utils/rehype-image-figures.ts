import type { Plugin } from 'unified'
import type { Root, Element, Parent } from 'hast'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import sharp from 'sharp'
import { visit } from 'unist-util-visit'

const dimensionCache = new Map<string, Promise<{ height: number, width: number } | undefined>>()

function isInside(root: string, path: string) {
  const rel = relative(root, path)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function localImagePath(src: string, filePath: string): string | undefined {
  const clean = src.split(/[?#]/, 1)[0]
  if (!clean || /^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith('data:'))
    return

  const workspace = resolve('.')
  const publicRoot = resolve('public')
  let path: string
  try {
    const decoded = decodeURIComponent(clean)
    path = decoded.startsWith('/')
      ? resolve(publicRoot, decoded.slice(1))
      : resolve(dirname(filePath), decoded)
  }
  catch {
    return
  }

  const allowedRoot = clean.startsWith('/') ? publicRoot : workspace
  return isInside(allowedRoot, path) ? path : undefined
}

function dimensions(path: string) {
  let pending = dimensionCache.get(path)
  if (!pending) {
    pending = sharp(path).metadata()
      .then(meta => meta.width && meta.height ? { width: meta.width, height: meta.height } : undefined)
      .catch(() => undefined)
    dimensionCache.set(path, pending)
  }
  return pending
}

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
  return async (tree, file) => {
    let imageCount = 0
    const dimensionTasks: Promise<void>[] = []
    const filePath = String(file?.path ?? file?.history?.[0] ?? '')

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img')
        return
      imageCount += 1
      const props = (node.properties ||= {})
      if (!('decoding' in props))
        props.decoding = 'async'
      if (!('loading' in props) && imageCount > 1)
        props.loading = 'lazy'
      const src = typeof props.src === 'string' ? props.src : ''
      const needsWidth = !('width' in props)
      const needsHeight = !('height' in props)
      if (src && filePath && (needsWidth || needsHeight)) {
        const path = localImagePath(src, filePath)
        if (path) {
          dimensionTasks.push(dimensions(path).then((size) => {
            if (!size)
              return
            if (needsWidth)
              props.width = size.width
            if (needsHeight)
              props.height = size.height
          }))
        }
      }
    })

    await Promise.all(dimensionTasks)

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

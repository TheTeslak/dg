import type { Comment, Element, ElementContent, Parent, Root, RootContent } from 'hast'
import type { Plugin } from 'unified'
import { toString } from 'hast-util-to-string'
import { visit } from 'unist-util-visit'
import { defaultLocale, isSupportedLocale, localeConfig, type SupportedLocale } from '../locales/config.ts'

interface Marker {
  index: number
  node: Comment
  parent: Parent
}

interface SourceEntry {
  title: string
  url: string
}

function element(tagName: string, properties: Element['properties'] = {}, children: ElementContent[] = []): Element {
  return { type: 'element', tagName, properties, children }
}

function externalHref(node: Element): string | undefined {
  if (node.tagName !== 'a')
    return
  const href = node.properties?.href
  return typeof href === 'string' && /^https?:\/\//.test(href) ? href : undefined
}

function sourceKey(url: string) {
  try {
    return new URL(url).href
  }
  catch {
    return url
  }
}

function localeFromFile(file: any): SupportedLocale {
  const filePath = String(file?.path ?? file?.history?.[0] ?? '')
  const match = filePath.match(/(?:articles|pages)[\/\\]([^/\\]+)[\/\\]/)
  return match && isSupportedLocale(match[1]) ? match[1] : defaultLocale
}

function buildSources(entries: SourceEntry[], refs: Map<string, string[]>, locale: SupportedLocale): Element {
  const items = entries.map((entry) => {
    const refIds = refs.get(sourceKey(entry.url)) ?? []
    let backrefs: ElementContent[]
    if (refIds.length) {
      const subscripts = '₁₂₃₄₅₆₇₈₉'
      backrefs = refIds.flatMap((id, index) => [
        ...(index ? [{ type: 'text', value: ' ' } as ElementContent] : []),
        element('a', {
          href: `#${id}`,
          className: ['source-backref'],
          ariaLabel: refIds.length > 1 ? `Go to reference ${index + 1}` : 'Go to reference',
        }, [{ type: 'text', value: `↑${refIds.length > 1 ? (subscripts[index] ?? '₊') : ''}` }]),
      ])
    }
    else {
      backrefs = [element('span', {
        className: ['source-backref', 'source-backref-orphan'],
        title: 'Link not found in article',
      }, [{ type: 'text', value: '↑' }])]
    }

    let domain = entry.url
    try {
      domain = new URL(entry.url).hostname.replace(/^www\./, '')
    }
    catch {}

    return element('div', { className: ['source-item'] }, [
      element('span', { className: ['source-backrefs'] }, backrefs),
      { type: 'text', value: ' ' },
      element('a', {
        href: entry.url,
        target: '_blank',
        rel: ['noopener'],
        className: ['source-title'],
      }, [{ type: 'text', value: entry.title }]),
      element('span', { className: ['source-domain'] }, [{ type: 'text', value: domain }]),
    ])
  })

  return element('details', { className: ['spoiler', 'sources-block'] }, [
    element('summary', { className: ['spoiler-summary'] }, [
      element('span', { className: ['spoiler-arrow', 'i-ri-arrow-right-s-line'], ariaHidden: 'true' }),
      element('span', {}, [{ type: 'text', value: localeConfig[locale].sourcesLabel }]),
    ]),
    element('div', { className: ['spoiler-content'] }, [
      element('div', { className: ['sources-list'] }, items),
    ]),
  ])
}

/** Process sources after rehype-raw, when Markdown and authored HTML links are
 * both ordinary HAST anchors. No HTML regexes or secondary parsing required. */
const rehypeSources: Plugin<[], Root> = () => {
  return (tree, file) => {
    const starts: Marker[] = []
    const ends: Marker[] = []

    visit(tree, 'comment', (node: Comment, index, parent) => {
      if (!parent || typeof index !== 'number')
        return
      const marker = node.value.trim().toLowerCase()
      if (marker.startsWith('sources'))
        starts.push({ node, index, parent })
      else if (marker.startsWith('/sources'))
        ends.push({ node, index, parent })
    })

    const frontmatter = (file.data as any)?.astro?.frontmatter
    if (!starts.length && !ends.length) {
      if (frontmatter?.sources === true)
        file.fail('frontmatter enables sources, but the article has no <!-- sources --> block.')
      return
    }
    if (starts.length !== 1 || ends.length !== 1)
      file.fail('article must contain exactly one sources block.', starts[1]?.node ?? ends[1]?.node ?? starts[0]?.node ?? ends[0]?.node)

    const start = starts[0]
    const end = ends[0]
    if (start.parent !== end.parent || start.index >= end.index)
      file.fail('sources block must have ordered <!-- sources --> and <!-- /sources --> markers.', start.node)

    const refs = new Map<string, string[]>()
    const entries: SourceEntry[] = []
    let refCounter = 0
    let beforeSources = true
    let inSources = false

    visit(tree, (node) => {
      if (node === start!.node) {
        beforeSources = false
        inSources = true
        return
      }
      if (node === end!.node) {
        inSources = false
        return
      }
      if (node.type !== 'element')
        return

      const href = externalHref(node)
      if (!href)
        return
      if (inSources) {
        entries.push({ title: toString(node).trim() || href, url: href })
        return
      }
      if (!beforeSources)
        return

      refCounter += 1
      node.properties ||= {}
      const id = typeof node.properties.id === 'string' && node.properties.id
        ? node.properties.id
        : `src-ref-${refCounter}`
      node.properties.id = id
      const key = sourceKey(href)
      const ids = refs.get(key) ?? []
      ids.push(id)
      refs.set(key, ids)
    })

    if (!entries.length) {
      file.fail('sources block does not contain any external links.', start.node)
    }
    for (const entry of entries) {
      if (!refs.has(sourceKey(entry.url)))
        file.fail(`source URL "${entry.url}" is not referenced in the article body.`, start.node)
    }

    start.parent.children.splice(start.index, end.index - start.index + 1, buildSources(entries, refs, localeFromFile(file)) as RootContent)
  }
}

export default rehypeSources

import type { Plugin } from 'unified'
import type { Root, Parent, Link } from 'mdast'
import { visit } from 'unist-util-visit'
import { toString } from 'mdast-util-to-string'

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

/**
 * Parses source-list blocks wrapped in <!-- sources -->
 * and replaces them with a custom spoiler block containing back-references.
 */
const remarkSources: Plugin<[], Root> = () => {
  return (tree: Root, file: any) => {
    // Resolve article locale from file path
    const filePath = file.history[0] || ''
    const localeMatch = filePath.match(/[\\/](en|ru|es|pt|de|fr)[\\/]/)
    const locale = localeMatch?.[1] || 'en'

    const titleText: Record<string, string> = {
      ru: 'Источники',
      en: 'Sources',
      es: 'Fuentes',
      pt: 'Fontes',
      de: 'Quellen',
      fr: 'Sources',
    }
    const headerText = titleText[locale] || titleText.en

    let inSources = false
    const linkMap = new Map<string, string[]>()
    let refCounter = 0
    const sourceEntries: { title: string, url: string }[] = []

    let startNode: any = null
    let endNode: any = null

    // Perform DFS to scan links and determine order before sources block
    function walk(node: any) {
      if (node.type === 'html') {
        const val = String(node.value || '').trim()
        if (val.startsWith('<!-- sources')) {
          inSources = true
          startNode = node
        } else if (val.startsWith('<!-- /sources')) {
          inSources = false
          endNode = node
        }
      } else if ((node as any).type === 'mdxFlowExpression' || (node as any).type === 'mdxTextExpression') {
        const val = (node as any).value?.trim() || ''
        if (val.startsWith('/* sources')) {
          inSources = true
          startNode = node as any
        } else if (val.startsWith('/* /sources')) {
          inSources = false
          endNode = node as any
        }
      }

      if (node.type === 'link') {
        const link = node as Link
        const href = link.url
        if (href && /^https?:\/\//.test(href)) {
          if (!inSources) {
            refCounter++
            const refId = `src-ref-${refCounter}`
            const data = (link.data ||= {}) as any
            data.hProperties ||= {}
            data.hProperties.id = refId

            const ids = linkMap.get(href) || []
            ids.push(refId)
            linkMap.set(href, ids)
          } else {
            const title = toString(link)
            sourceEntries.push({ title: title || href, url: href })
          }
        }
      }

      if ('children' in node && Array.isArray(node.children)) {
        for (const child of node.children) {
          walk(child)
        }
      }
    }

    walk(tree)

    if (!startNode || !endNode || sourceEntries.length === 0) {
      return
    }

    // Build expandable sources spoiler block
    let html = `<details class="spoiler sources-block">\n`
    html += `<summary class="spoiler-summary">`
    html += `<span class="spoiler-arrow i-ri-arrow-right-s-line" aria-hidden="true"></span>`
    html += `<span>${escapeHtml(headerText)}</span>`
    html += `</summary>\n`
    html += `<div class="spoiler-content"><div class="sources-list">\n`

    for (const entry of sourceEntries) {
      const refIds = linkMap.get(entry.url)
      let backrefHtml: string
      if (refIds && refIds.length > 1) {
        const subscripts = '₁₂₃₄₅₆₇₈₉'
        backrefHtml = refIds.map((id, i) => {
          const sub = i < subscripts.length ? subscripts[i] : `₊`
          return `<a href="#${escapeHtml(id)}" class="source-backref" aria-label="Go to reference ${i + 1}">↑${sub}</a>`
        }).join(' ')
      } else if (refIds && refIds.length === 1) {
        backrefHtml = `<a href="#${escapeHtml(refIds[0])}" class="source-backref" aria-label="Go to reference">↑</a>`
      } else {
        backrefHtml = `<span class="source-backref source-backref-orphan" title="Link not found in article">↑</span>`
      }

      let domain = ''
      try {
        domain = new URL(entry.url).hostname.replace(/^www\./, '')
      } catch {
        domain = entry.url
      }

      html += `<div class="source-item">`
      html += `<span class="source-backrefs">${backrefHtml}</span> `
      html += `<a href="${escapeHtml(entry.url)}" target="_blank" rel="noopener" class="source-title">${escapeHtml(entry.title)}</a>`
      html += `<span class="source-domain">${escapeHtml(domain)}</span>`
      html += `</div>\n`
    }

    html += `</div></div>\n</details>\n`

    let foundParent: Parent | null = null
    let startIdx = -1
    let endIdx = -1

    visit(tree, (node) => {
      if ('children' in node && Array.isArray(node.children)) {
        const p = node as Parent
        const s = p.children.indexOf(startNode!)
        const e = p.children.indexOf(endNode!)
        if (s !== -1 && e !== -1) {
          foundParent = p
          startIdx = s
          endIdx = e
          return false
        }
      }
    })

    if (foundParent && startIdx !== -1 && endIdx !== -1) {
      (foundParent as any).children.splice(startIdx, endIdx - startIdx + 1, {
        type: 'html',
        value: html,
      } as any)
    }
  }
}

export default remarkSources

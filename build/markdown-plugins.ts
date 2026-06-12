import type MarkdownIt from 'markdown-it'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sizeOf from 'image-size'
import { defaultLocale, isSupportedLocale, localeConfig } from '../src/locales/config'
import { isRealArticle } from './article'
import { warnFrontmatter } from './frontmatter'

const currentDir = dirname(fileURLToPath(import.meta.url))

/**
 * Convert standalone ![alt](src) into <figure><img><figcaption>alt</figcaption></figure>.
 * Triggers when <p> contains a single <img>. If alt text exists, it adds <figcaption>.
 */
export function imageFiguresPlugin(md: MarkdownIt) {
  md.core.ruler.after('inline', 'image_figures', (state) => {
    const tokens = state.tokens
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.type !== 'paragraph_open')
        continue

      const inline = tokens[i + 1]
      const close = tokens[i + 2]
      if (!inline || inline.type !== 'inline' || !close || close.type !== 'paragraph_close')
        continue

      // Check: inline children must be exactly one image token
      const children = inline.children || []
      if (children.length !== 1 || children[0].type !== 'image')
        continue

      const imgToken = children[0]
      const alt = imgToken.content?.trim()

      // Rewrite paragraph_open → figure_open
      token.type = 'figure_open'
      token.tag = 'figure'

      // Rewrite paragraph_close → figure_close
      close.type = 'figure_close'
      close.tag = 'figure'

      if (alt) {
        // Insert figcaption tokens after the inline (before figure_close)
        const captionOpen = new state.Token('html_block', '', 0)
        captionOpen.content = `<figcaption>${md.utils.escapeHtml(alt)}</figcaption>\n`

        // Clear the alt from the image so it doesn't duplicate as attr
        // (keep it as the HTML alt attribute on <img> for a11y)
        tokens.splice(i + 2, 0, captionOpen)
        i += 1 // skip the inserted token
      }
    }
  })
}

/**
 * Automatically read physical image dimensions and inject width/height.
 * Mark non-first markdown images as lazy to avoid delaying above-the-fold media.
 */
export function imageAttributesPlugin(md: MarkdownIt) {
  md.core.ruler.after('image_figures', 'image_attributes', (state) => {
    let imageIndex = 0

    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children)
        continue

      for (const child of token.children) {
        if (child.type !== 'image')
          continue

        imageIndex += 1
        const src = child.attrGet('src')
        child.attrSet('decoding', 'async')

        if (!child.attrGet('loading') && imageIndex > 1)
          child.attrSet('loading', 'lazy')

        if (src && !/^(?:[a-z]+:)?\/\//i.test(src) && !src.startsWith('data:')) {
          try {
            const cleanSrc = src.split(/[?#]/, 1)[0]
            let filePath = ''
            if (cleanSrc.startsWith('/')) {
              filePath = resolve(currentDir, '../public', cleanSrc.slice(1))
            }
            else {
              const id = state.env?.id || state.env?.path || ''
              if (id) {
                filePath = resolve(id, '..', cleanSrc)
              }
            }
            if (filePath && existsSync(filePath)) {
              const dimensions = sizeOf(readFileSync(filePath))
              if (dimensions.width && dimensions.height) {
                child.attrSet('width', dimensions.width.toString())
                child.attrSet('height', dimensions.height.toString())
              }
            }
          }
          catch {
            // Missing dimensions should not block markdown rendering.
          }
        }
      }
    }
  })
}

/**
 * Warn if article images lack alt text (WCAG 1.1.1).
 */
export function imageAltCheckPlugin(md: MarkdownIt) {
  md.core.ruler.after('image_attributes', 'image_alt_check', (state) => {
    const id = state.env?.id || state.env?.path || ''
    if (!isRealArticle(id))
      return

    const tokens = state.tokens
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.type !== 'inline' || !token.children)
        continue
      for (const child of token.children) {
        if (child.type !== 'image')
          continue
        const alt = child.content?.trim()
        if (!alt) {
          const src = child.attrGet('src') || '(unknown)'
          warnFrontmatter(`[a11y] ${id}: image "${src}" is missing alt text (WCAG 1.1.1).`)
        }
      }
    }
  })
}

/**
 * Assigns ID to external links for sources back-referencing.
 */
export function sourceLinkIdsPlugin(md: MarkdownIt) {
  md.core.ruler.after('image_alt_check', 'source_link_ids', (state) => {
    const id = state.env?.id || state.env?.path || ''
    if (!isRealArticle(id))
      return

    // Check for sources block presence
    let hasSourcesBlock = false
    for (const token of state.tokens) {
      if (token.type === 'html_block' && token.content.includes('<!-- sources -->')) {
        hasSourcesBlock = true
        break
      }
    }
    if (!hasSourcesBlock)
      return

    // Find index to scan links before sources block
    let sourcesStartIdx = -1
    for (let i = 0; i < state.tokens.length; i++) {
      if (state.tokens[i].type === 'html_block' && state.tokens[i].content.includes('<!-- sources -->')) {
        sourcesStartIdx = i
        break
      }
    }

    const linkMap = new Map<string, string[]>()
    const linkOrder: string[] = [] // URLs in first appearance order
    let refCounter = 0

    for (let i = 0; i < sourcesStartIdx; i++) {
      const token = state.tokens[i]
      if (token.type !== 'inline' || !token.children)
        continue
      for (const child of token.children) {
        // Markdown links
        if (child.type === 'link_open') {
          const href = child.attrGet('href')
          if (!href || !/^https?:\/\//.test(href))
            continue

          const refId = `src-ref-${++refCounter}`
          child.attrSet('id', refId)

          const ids = linkMap.get(href) || []
          ids.push(refId)
          linkMap.set(href, ids)

          if (!linkOrder.includes(href))
            linkOrder.push(href)
        }
        // HTML inline links
        else if (child.type === 'html_inline' && child.content.startsWith('<a ')) {
          const hrefMatch = child.content.match(/href="(https?:\/\/[^"]+)"/)
          if (!hrefMatch)
            continue
          const href = hrefMatch[1]

          const refId = `src-ref-${++refCounter}`
          // Inject ID into tag
          child.content = child.content.replace(/^<a /, `<a id="${refId}" `)

          const ids = linkMap.get(href) || []
          ids.push(refId)
          linkMap.set(href, ids)

          if (!linkOrder.includes(href))
            linkOrder.push(href)
        }
      }
    }

    state.env.sourceLinkMap = linkMap
    state.env.sourceLinkOrder = linkOrder
  })
}

/**
 * Renders sources spoiler with back-references.
 */
export function sourcesBlockPlugin(md: MarkdownIt, normalizedFrontmatterById: Map<string, Record<string, any>>) {
  md.core.ruler.after('source_link_ids', 'sources_block', (state) => {
    const id = state.env?.id || state.env?.path || ''
    if (!isRealArticle(id))
      return

    const linkMap: Map<string, string[]> | undefined = state.env.sourceLinkMap
    if (!linkMap)
      return

    // Find block markers
    let startIdx = -1
    let endIdx = -1
    for (let i = 0; i < state.tokens.length; i++) {
      const token = state.tokens[i]
      if (token.type === 'html_block') {
        if (startIdx === -1 && token.content.trim().startsWith('<!-- sources'))
          startIdx = i
        else if (startIdx !== -1 && token.content.trim().startsWith('<!-- /sources'))
          endIdx = i
      }
    }

    if (startIdx === -1 || endIdx === -1) {
      // Check frontmatter validity
      const resolved = normalizedFrontmatterById.get(resolve(id))
      if (resolved?.sources)
        warnFrontmatter(`[sources] ${id}: frontmatter has "sources: true" but no <!-- sources --> block found.`)
      return
    }

    // Extract source links
    const sourceEntries: { title: string, url: string }[] = []
    for (let i = startIdx + 1; i < endIdx; i++) {
      const token = state.tokens[i]
      if (token.type !== 'inline' || !token.children)
        continue
      for (let c = 0; c < token.children.length; c++) {
        const child = token.children[c]
        if (child.type !== 'link_open')
          continue
        const href = child.attrGet('href')
        if (!href)
          continue
        // Collect title text
        let title = ''
        for (let t = c + 1; t < token.children.length; t++) {
          if (token.children[t].type === 'link_close')
            break
          if (token.children[t].type === 'text' || token.children[t].type === 'code_inline')
            title += token.children[t].content
        }
        sourceEntries.push({ title: title || href, url: href })
      }
    }

    if (sourceEntries.length === 0)
      return

    // Warn on unreferenced sources
    for (const entry of sourceEntries) {
      if (!linkMap.has(entry.url))
        warnFrontmatter(`[sources] ${id}: source URL "${entry.url}" not found in article body.`)
    }

    // Resolve localized title
    const localeMatch = id.match(/pages[\\/]([^/\\]+)[\\/]/)
    const locale = localeMatch?.[1] && isSupportedLocale(localeMatch[1])
      ? localeMatch[1]
      : defaultLocale
    const headerText = localeConfig[locale].sourcesLabel

    const esc = md.utils.escapeHtml
    let html = `<details class="spoiler sources-block">\n`
    html += `<summary class="spoiler-summary">`
    html += `<div class="spoiler-arrow i-ri:arrow-right-s-line"></div>`
    html += `<span>${esc(headerText)}</span>`
    html += `</summary>\n`
    html += `<div class="spoiler-content"><div class="sources-list">\n`

    for (const entry of sourceEntries) {
      const refIds = linkMap.get(entry.url)
      let backrefHtml: string
      if (refIds && refIds.length > 1) {
        // Multi-reference back-links
        const subscripts = '₁₂₃₄₅₆₇₈₉'
        backrefHtml = refIds.map((id, i) => {
          const sub = i < subscripts.length ? subscripts[i] : `₊`
          return `<a href="#${esc(id)}" class="source-backref" aria-label="Go to reference ${i + 1}">↑${sub}</a>`
        }).join(' ')
      }
      else if (refIds && refIds.length === 1) {
        backrefHtml = `<a href="#${esc(refIds[0])}" class="source-backref" aria-label="Go to reference">↑</a>`
      }
      else {
        backrefHtml = `<span class="source-backref source-backref-orphan" title="Link not found in article">↑</span>`
      }

      let domain = ''
      try {
        domain = new URL(entry.url).hostname.replace(/^www\./, '')
      }
      catch {
        domain = entry.url
      }

      html += `<div class="source-item">`
      html += `<span class="source-backrefs">${backrefHtml}</span> `
      html += `<a href="${esc(entry.url)}" target="_blank" rel="noopener" class="source-title">${esc(entry.title)}</a>`
      html += `<span class="source-domain">${esc(domain)}</span>`
      html += `</div>\n`
    }

    html += `</div></div>\n</details>\n`

    // Replace all tokens from startIdx to endIdx (inclusive) with a single html_block
    const replacementToken = new state.Token('html_block', '', 0)
    replacementToken.content = html
    state.tokens.splice(startIdx, endIdx - startIdx + 1, replacementToken)
  })
}

/**
 * Custom ==highlight== syntax (Obsidian-style mark).
 * Converts ==text== to <mark>text</mark>, no external plugin needed.
 */
export function markHighlightPlugin(md: MarkdownIt) {
  md.inline.ruler.before('emphasis', 'mark', (state, silent) => {
    if (silent)
      return false
    const start = state.pos
    const src = state.src
    if (src.charCodeAt(start) !== 0x3D /* = */ || src.charCodeAt(start + 1) !== 0x3D)
      return false

    const end = src.indexOf('==', start + 2)
    if (end === -1)
      return false

    const content = src.slice(start + 2, end)
    if (!content)
      return false

    const tokenOpen = state.push('mark_open', 'mark', 1)
    tokenOpen.markup = '=='
    const tokenText = state.push('text', '', 0)
    tokenText.content = content
    const tokenClose = state.push('mark_close', 'mark', -1)
    tokenClose.markup = '=='

    state.pos = end + 2
    return true
  })
}

/**
 * Register all custom markdown-it plugins.
 */
export function registerCustomPlugins(md: MarkdownIt, normalizedFrontmatterById: Map<string, Record<string, any>>) {
  imageFiguresPlugin(md)
  imageAttributesPlugin(md)
  imageAltCheckPlugin(md)
  sourceLinkIdsPlugin(md)
  sourcesBlockPlugin(md, normalizedFrontmatterById)
  markHighlightPlugin(md)
}

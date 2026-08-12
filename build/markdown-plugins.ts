import type MarkdownIt from 'markdown-it'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sizeOf from 'image-size'
import { defaultLocale, isSupportedLocale, localeConfig } from '../src/locales/config'
import { isRealArticle } from './article'
import { parseSpoilerOpeningTitle } from './content-cleanup'
import { isRealFind } from './find'
import { warnFrontmatter } from './frontmatter'

const currentDir = dirname(fileURLToPath(import.meta.url))
const mutedSpanSyntax = '{.muted}'
const suspiciousInlineAttributeRE = /\[[^\]\n]{0,120}(?:\]\{[^}\n]{0,160}(?:\}|$)|\[\{[^}\n]{0,160}(?:\}|$)|\{[.#][^}\n]{0,80}(?:\}|$))/g

function isContentPage(id: string) {
  return isRealArticle(id) || isRealFind(id)
}

export interface MarkdownDiagnostic {
  line?: number
  message: string
  severity: 'error'
}

export interface MarkdownRenderEnv {
  id?: string
  markdownDiagnostics?: MarkdownDiagnostic[]
  path?: string
  reportMarkdownDiagnostics?: boolean
}

export function formatMarkdownDiagnostic(diagnostic: MarkdownDiagnostic, id = '(unknown markdown)') {
  const line = diagnostic.line == null ? '' : `:${diagnostic.line}`
  return `[markdown] ${id}${line}: ${diagnostic.message}`
}

function addMarkdownDiagnostic(env: MarkdownRenderEnv | undefined, diagnostic: MarkdownDiagnostic) {
  const target = env || {}
  target.markdownDiagnostics ||= []
  target.markdownDiagnostics.push(diagnostic)

  if (target.reportMarkdownDiagnostics !== false) {
    const id = target.id || target.path || '(unknown markdown)'
    warnFrontmatter(formatMarkdownDiagnostic(diagnostic, id))
  }
}

function renderSpoilerOpen(title: string, escapeHtml: (value: string) => string) {
  const safeTitle = title.trim() || 'Spoiler'
  return [
    '<details class="spoiler">',
    '<summary class="spoiler-summary">',
    '<div class="spoiler-arrow i-ri:arrow-right-s-line"></div>',
    `<span>${escapeHtml(safeTitle)}</span>`,
    '</summary>',
    '<div class="spoiler-content">',
    '',
  ].join('\n')
}

function skipInlineAttributeWhitespace(src: string, pos: number) {
  while (pos < src.length) {
    const code = src.charCodeAt(pos)
    if (
      code !== 0x20 /* space */
      && code !== 0x09 /* tab */
      && code !== 0xA0 /* no-break space */
      && code !== 0x202F /* narrow no-break space */
    ) {
      break
    }
    pos += 1
  }
  return pos
}

function parseQuotedAttributeValue(src: string, pos: number) {
  const quote = src.charCodeAt(pos)
  if (quote !== 0x22 /* " */ && quote !== 0x27 /* ' */)
    return

  let value = ''
  let next = pos + 1
  while (next < src.length) {
    const code = src.charCodeAt(next)
    if (code === quote)
      return { value, pos: next + 1 }
    if (code === 0x0A /* \n */ || code === 0x0D /* \r */)
      return
    if (code === 0x5C /* \ */ && next + 1 < src.length) {
      value += src[next + 1]
      next += 2
      continue
    }
    value += src[next]
    next += 1
  }
}

function parseGlossaryAttributes(src: string, pos: number) {
  if (src.charCodeAt(pos) !== 0x7B /* { */)
    return

  let next = pos + 1
  const attrs: Partial<Record<'term' | 'definition', string>> = {}

  while (next < src.length) {
    next = skipInlineAttributeWhitespace(src, next)

    if (src.charCodeAt(next) === 0x7D /* } */) {
      const term = attrs.term?.trim()
      const definition = attrs.definition?.trim()
      if (!term || !definition)
        return
      return { term, definition, pos: next + 1 }
    }

    const name = src.slice(next).match(/^[a-z][\w:-]*/i)?.[0]
    if (!name || (name !== 'term' && name !== 'definition'))
      return

    next += name.length
    next = skipInlineAttributeWhitespace(src, next)
    if (src.charCodeAt(next) !== 0x3D /* = */)
      return

    next = skipInlineAttributeWhitespace(src, next + 1)
    const parsed = parseQuotedAttributeValue(src, next)
    if (!parsed)
      return

    attrs[name] = parsed.value
    next = parsed.pos
  }
}

/**
 * Djot-inspired spoiler block:
 *
 * ::: spoiler Optional title
 * Markdown content
 * :::
 */
export function spoilerBlockPlugin(md: MarkdownIt) {
  md.block.ruler.before('fence', 'spoiler', (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine]
    const max = state.eMarks[startLine]
    const line = state.src.slice(start, max).trimEnd()
    const title = parseSpoilerOpeningTitle(line)

    if (title == null)
      return false
    if (state.sCount[startLine] - state.blkIndent >= 4)
      return false
    if (silent)
      return true

    let nextLine = startLine + 1
    while (nextLine < endLine) {
      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine]
      const lineMax = state.eMarks[nextLine]
      if (state.src.slice(lineStart, lineMax).trim() === ':::')
        break
      nextLine += 1
    }

    if (nextLine >= endLine) {
      addMarkdownDiagnostic(state.env as MarkdownRenderEnv, {
        line: startLine + 1,
        message: 'unclosed spoiler block.',
        severity: 'error',
      })
      return false
    }

    const open = state.push('html_block', '', 0)
    open.content = renderSpoilerOpen(title, md.utils.escapeHtml)
    open.map = [startLine, startLine + 1]

    state.md.block.tokenize(state, startLine + 1, nextLine)

    const close = state.push('html_block', '', 0)
    close.content = '</div>\n</details>\n'
    close.map = [nextLine, nextLine + 1]

    state.line = nextLine + 1
    return true
  }, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  })
}

/**
 * Djot-inspired inline muted span: [text]{.muted}
 *
 * Only `.muted` is supported intentionally; this is not a general attributes parser.
 */
export function mutedSpanPlugin(md: MarkdownIt) {
  md.inline.ruler.before('link', 'muted_span', (state, silent) => {
    const start = state.pos
    if (state.src.charCodeAt(start) !== 0x5B /* [ */)
      return false

    const labelEnd = state.md.helpers.parseLinkLabel(state, start, false)
    if (labelEnd < 0)
      return false

    const syntaxStart = labelEnd + 1
    if (state.src.slice(syntaxStart, syntaxStart + mutedSpanSyntax.length) !== mutedSpanSyntax)
      return false

    const content = state.src.slice(start + 1, labelEnd)
    if (!content)
      return false

    if (!silent) {
      const open = state.push('span_open', 'span', 1)
      open.attrSet('class', 'muted')
      state.md.inline.parse(content, state.md, state.env, state.tokens)
      state.push('span_close', 'span', -1)
    }

    state.pos = syntaxStart + mutedSpanSyntax.length
    return true
  })
}

/**
 * Inline glossary term: [visible text]{term="Term" definition="Definition"}
 *
 * Keeps authoring concise while preserving the existing GlossaryTerm runtime UI.
 */
export function glossaryTermPlugin(md: MarkdownIt) {
  md.inline.ruler.before('link', 'glossary_term', (state, silent) => {
    const start = state.pos
    if (state.src.charCodeAt(start) !== 0x5B /* [ */)
      return false

    const labelEnd = state.md.helpers.parseLinkLabel(state, start, false)
    if (labelEnd < 0)
      return false

    const attrs = parseGlossaryAttributes(state.src, labelEnd + 1)
    if (!attrs)
      return false

    const content = state.src.slice(start + 1, labelEnd)
    if (!content)
      return false

    if (!silent) {
      const open = state.push('glossary_term_open', 'GlossaryTerm', 1)
      open.attrSet('term', attrs.term)
      open.attrSet('definition', attrs.definition)
      state.md.inline.parse(content, state.md, state.env, state.tokens)
      state.push('glossary_term_close', 'GlossaryTerm', -1)
    }

    state.pos = attrs.pos
    return true
  })
}

/**
 * Warn when Djot-style attributes were probably mistyped and leaked into text.
 */
export function inlineAttributeLeakWarningPlugin(md: MarkdownIt) {
  md.core.ruler.after('inline', 'inline_attribute_leak_warning', (state) => {
    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children)
        continue

      const line = token.map?.[0] == null ? undefined : token.map[0] + 1
      for (const child of token.children) {
        if (child.type !== 'text')
          continue

        const matches = child.content.match(suspiciousInlineAttributeRE)
        if (!matches)
          continue

        for (const match of matches) {
          addMarkdownDiagnostic(state.env as MarkdownRenderEnv, {
            line,
            message: `possible malformed inline attribute syntax "${match}". Use [text]{.muted} or [text]{term="Term" definition="Definition"}.`,
            severity: 'error',
          })
        }
      }
    }
  })
}

/**
 * Convert standalone ![alt](src) into <figure><img><figcaption>alt</figcaption></figure>.
 * Supports pipe-separated layout flags and an optional distinct caption:
 * ![alt|wide|caption=Visible caption](src).
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
      const rawAlt = imgToken.content?.trim() || ''
      const parts = rawAlt.split('|').map(s => s.trim())
      const cleanAlt = parts[0] || ''
      const options = parts.slice(1)
      const customCaption = options
        .find(option => option.startsWith('caption='))
        ?.slice('caption='.length)
        .trim()

      // Set clean content and alt attribute on the image token
      imgToken.content = cleanAlt
      imgToken.attrSet('alt', cleanAlt)
      if (imgToken.children) {
        for (const child of imgToken.children) {
          child.content = cleanAlt
        }
      }

      // Rewrite paragraph_open → figure_open
      token.type = 'figure_open'
      token.tag = 'figure'

      // Rewrite paragraph_close → figure_close
      close.type = 'figure_close'
      close.tag = 'figure'

      if (options.includes('wide')) {
        token.attrSet('class', 'img-wide')
      }

      const caption = customCaption ?? cleanAlt
      const showCaption = caption && !options.includes('no-caption')

      if (showCaption) {
        // Insert figcaption tokens after the inline (before figure_close)
        const captionOpen = new state.Token('html_block', '', 0)
        captionOpen.content = `<figcaption>${md.utils.escapeHtml(caption)}</figcaption>\n`

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
    if (!isContentPage(id))
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
    if (!isContentPage(id))
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
    if (!isContentPage(id))
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
  spoilerBlockPlugin(md)
  mutedSpanPlugin(md)
  glossaryTermPlugin(md)
  imageFiguresPlugin(md)
  imageAttributesPlugin(md)
  imageAltCheckPlugin(md)
  sourceLinkIdsPlugin(md)
  sourcesBlockPlugin(md, normalizedFrontmatterById)
  markHighlightPlugin(md)
  inlineAttributeLeakWarningPlugin(md)
}

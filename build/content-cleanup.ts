const mutedSpanRE = /\[([^\]\n]+)\]\{\.muted\}/g
const glossaryTermRE = /\[([^\]\n]+)\]\{([^}\n]+)\}/g

export function extractDirectiveLine(line: string): string {
  return line.replace(/^(?:[ \t]*>[ \t]?)+/, '').trim()
}

export function parseSpoilerOpeningTitle(line: string) {
  const clean = extractDirectiveLine(line)
  const match = clean.match(/^:::[ \t]+spoiler(?:[ \t]+(\S.*))?$/)
  if (!match)
    return

  return (match[1] ?? '').trim()
}

export function parseAsciiOpeningLabel(line: string) {
  const clean = extractDirectiveLine(line)
  const match = clean.match(/^:::[ \t]+ascii(?:[ \t]+(\S.*))?$/)
  if (!match)
    return

  return (match[1] ?? '').trim()
}

export function stripContainers(content: string, closeMarkerReplacement = '') {
  type Container = { kind: 'spoiler' } | { kind: 'ascii' }
  const stack: Container[] = []
  let fenceChar: string | null = null
  let fenceLen = 0

  const lines = content.split('\n')
  return lines
    .map((line, i) => {
      const clean = extractDirectiveLine(line)
      const prevLine = i > 0 ? extractDirectiveLine(lines[i - 1]) : ''
      const prevLineBlank = prevLine === ''

      const top = stack[stack.length - 1]

      if (top?.kind === 'ascii') {
        if (clean === ':::' && prevLineBlank) {
          stack.pop()
        }
        return ''
      }

      if (fenceChar !== null) {
        const closeMatch = clean.match(/^(`{3,}|~{3,})[ \t]*$/)
        if (closeMatch && closeMatch[1][0] === fenceChar && closeMatch[1].length >= fenceLen) {
          fenceChar = null
          fenceLen = 0
        }
        return line
      }

      const openMatch = clean.match(/^(?:`{3,}|~{3,})/)
      if (openMatch) {
        fenceChar = openMatch[0][0]
        fenceLen = openMatch[0].length
        return line
      }

      const asciiArg = parseAsciiOpeningLabel(line)
      if (asciiArg !== undefined) {
        stack.push({ kind: 'ascii' })
        return ''
      }

      const spoilerTitle = parseSpoilerOpeningTitle(line)
      if (spoilerTitle !== undefined) {
        stack.push({ kind: 'spoiler' })
        return spoilerTitle
      }

      if (clean === ':::') {
        if (prevLineBlank && stack.length > 0) {
          const popped = stack.pop()
          if (popped?.kind === 'spoiler')
            return closeMarkerReplacement
        }
        return ''
      }

      return line
    })
    .join('\n')
}

export function stripMutedSpans(content: string) {
  return content.replace(mutedSpanRE, '$1')
}

export function stripGlossaryTerms(content: string) {
  return content.replace(glossaryTermRE, (match, text: string, attrs: string) => {
    return /\bterm\s*=/.test(attrs) && /\bdefinition\s*=/.test(attrs)
      ? text
      : match
  })
}

interface MarkdownPlainTextOptions {
  closeMarkerReplacement?: string
  codeReplacement?: string
  collapseWhitespace?: boolean
}

export function markdownToPlainText(content: string, options: MarkdownPlainTextOptions = {}) {
  const replacement = options.codeReplacement ?? ''
  let text = content
    // Remove [[toc]] directives.
    .replace(/\[\[toc\]\]/gi, '')
    // Remove code fences before handling custom block markers.
    .replace(/```[\s\S]*?```/g, replacement)

  text = stripContainers(text, options.closeMarkerReplacement ?? replacement)

  text = stripMutedSpans(stripGlossaryTerms(text))
    // Remove inline code.
    .replace(/`[^`]*`/g, replacement)
    // Remove HTML tags and Vue components.
    .replace(/<[^>]+>/g, replacement)
    // Remove images.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, replacement)
    // Convert links to just text.
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Remove headings markers.
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquote markers.
    .replace(/^>\s?/gm, '')
    // Remove horizontal rules.
    .replace(/^-{3,}$/gm, '')
    // Remove bold/italic markers.
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Remove strikethrough.
    .replace(/~~([^~]+)~~/g, '$1')

  if (options.collapseWhitespace) {
    return text
      .replace(/\s+/g, ' ')
      .trim()
  }

  return text
    .replace(/\n{2,}/g, '\n')
    .trim()
}

export function stripMarkdownForSearch(content: string) {
  return markdownToPlainText(content, {
    closeMarkerReplacement: ' ',
    codeReplacement: ' ',
    collapseWhitespace: true,
  })
}

export function estimateReadingMinutes(content: string): number {
  const text = stripMarkdownForSearch(content)

  const words = text.match(/[a-z0-9\u0400-\u04FF]+(?:['\-][a-z0-9\u0400-\u04FF]+)*/gi)?.length || 0
  const cjkChars = text.match(/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g)?.length || 0
  const units = words + cjkChars
  return Math.max(1, Math.ceil(units / 200))
}

export function extractExcerpt(content: string, maxLength: number): string {
  let text = markdownToPlainText(content)
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  text = lines.join(' ').trim()

  if (text.length > maxLength) {
    text = text.slice(0, maxLength)
    const lastSpace = text.lastIndexOf(' ')
    if (lastSpace > maxLength * 0.6)
      text = text.slice(0, lastSpace)
    text += '…'
  }

  return text
}

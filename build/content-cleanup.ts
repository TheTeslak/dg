const mutedSpanRE = /\[([^\]\n]+)\]\{\.muted\}/g

export function parseSpoilerOpeningTitle(line: string) {
  const trimmed = line.trim()
  const parts = trimmed.split(/[ \t]+/)
  if (parts[0] !== ':::' || parts[1] !== 'spoiler')
    return

  return trimmed.slice('::: spoiler'.length).trim()
}

export function stripSpoilerMarkers(content: string, closeMarkerReplacement = '') {
  let isInSpoiler = false

  return content
    .split('\n')
    .map((line) => {
      const title = parseSpoilerOpeningTitle(line)
      if (title != null) {
        isInSpoiler = true
        return title
      }

      if (isInSpoiler && line.trim() === ':::') {
        isInSpoiler = false
        return closeMarkerReplacement
      }

      return line
    })
    .join('\n')
}

export function stripMutedSpans(content: string) {
  return content.replace(mutedSpanRE, '$1')
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

  text = stripSpoilerMarkers(text, options.closeMarkerReplacement ?? replacement)

  text = stripMutedSpans(text)
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

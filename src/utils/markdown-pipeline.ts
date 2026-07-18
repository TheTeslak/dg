import rehypeExternalLinks from 'rehype-external-links'
import rehypeRaw from 'rehype-raw'
import remarkBreaks from 'remark-breaks'
import { remarkAlert } from 'remark-github-blockquote-alert'
import rehypeComponents from './rehype-components.ts'
import rehypeHeadingsToc from './rehype-headings-toc.ts'
import rehypeImageFigures from './rehype-image-figures.ts'
import rehypeSources from './rehype-sources.ts'
import remarkComponentClose from './remark-component-close.ts'
import remarkAttrDiagnostics from './remark-attr-diagnostics.ts'
import remarkInlineAttrsSyntax from './remark-inline-attrs-syntax.ts'
import remarkMarkSyntax from './remark-mark-syntax.ts'
import remarkSpoiler from './remark-spoiler.ts'

export const remarkPlugins = [
  remarkMarkSyntax,
  remarkInlineAttrsSyntax,
  remarkComponentClose,
  remarkSpoiler,
  remarkAttrDiagnostics,
  remarkAlert,
  remarkBreaks,
] as const

export const markdownProcessorOptions = {
  // Keep authored punctuation stable in the site, feeds, and test processor.
  smartypants: false,
} as const

export const siteRehypePlugins = [
  rehypeRaw,
  rehypeSources,
  rehypeComponents,
  rehypeHeadingsToc,
  [rehypeExternalLinks, { target: '_blank', rel: ['noopener'] }],
  rehypeImageFigures,
] as const

export const feedRehypePlugins = [
  rehypeRaw,
  rehypeSources,
  [rehypeComponents, { mode: 'feed' }],
  [rehypeHeadingsToc, { permalinks: false, toc: false }],
  [rehypeExternalLinks, { target: '_blank', rel: ['noopener'] }],
  rehypeImageFigures,
] as const

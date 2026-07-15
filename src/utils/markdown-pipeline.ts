import rehypeExternalLinks from 'rehype-external-links'
import rehypeRaw from 'rehype-raw'
import remarkBreaks from 'remark-breaks'
import { remarkAlert } from 'remark-github-blockquote-alert'
import rehypeComponents from './rehype-components.ts'
import rehypeHeadingIds from './rehype-heading-ids.ts'
import rehypeImageFigures from './rehype-image-figures.ts'
import remarkComponentClose from './remark-component-close.ts'
import remarkInlineAttrs from './remark-inline-attrs.ts'
import remarkMark from './remark-mark.ts'
import remarkSources from './remark-sources.ts'
import remarkSpoiler from './remark-spoiler.ts'
import remarkToc from './remark-toc.ts'

export const remarkPlugins = [
  remarkComponentClose,
  remarkSpoiler,
  remarkInlineAttrs,
  remarkMark,
  remarkAlert,
  remarkToc,
  remarkSources,
  remarkBreaks,
] as const

export const siteRehypePlugins = [
  rehypeRaw,
  rehypeComponents,
  rehypeHeadingIds,
  [rehypeExternalLinks, { target: '_blank', rel: ['noopener'] }],
  rehypeImageFigures,
] as const

export const feedRehypePlugins = [
  rehypeRaw,
  [rehypeComponents, { mode: 'feed' }],
  rehypeHeadingIds,
  [rehypeExternalLinks, { target: '_blank', rel: ['noopener'] }],
  rehypeImageFigures,
] as const

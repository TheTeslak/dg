import { Buffer } from 'node:buffer'
import { basename, dirname, extname, resolve } from 'node:path'
import MarkdownItShiki from '@shikijs/markdown-it'
import { transformerNotationDiff, transformerNotationHighlight, transformerNotationWordHighlight } from '@shikijs/transformers'
import { rendererRich, transformerTwoslash } from '@shikijs/twoslash'
import Vue from '@vitejs/plugin-vue'
import fs from 'fs-extra'
import matter from 'gray-matter'
import anchor from 'markdown-it-anchor'
import GitHubAlerts from 'markdown-it-github-alerts'
import LinkAttributes from 'markdown-it-link-attributes'
import TOC from 'markdown-it-table-of-contents'
import sharp from 'sharp'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import Markdown from 'unplugin-vue-markdown/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import VueRouter from 'unplugin-vue-router/vite'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import Exclude from 'vite-plugin-optimize-exclude'
import generateSitemap from 'vite-ssg-sitemap'
import SVG from 'vite-svg-loader'
import { slugify } from './scripts/slugify'
import { isPostVisible } from './src/logics/post-visibility'
import { siteOrigin } from './src/logics/site'
import 'vite-ssg'

const isDev = process.env.NODE_ENV !== 'production'
const promises: Promise<any>[] = []
const frontmatterWarnings = new Set<string>()
const queuedOgOutputs = new Set<string>()
const normalizedFrontmatterById = new Map<string, Record<string, any>>()
const supportedLocales = ['en', 'ru', 'es'] as const
const supportedOgSourceExtensions = ['avif', 'webp', 'png', 'jpg', 'jpeg'] as const
const supportedAudioExtensions = ['.m4a', '.opus', '.ogg', '.mp3', '.wav'] as const
const audioMetadataPath = resolve(__dirname, 'data/audio-metadata.json')
const audioMetadata: Record<string, { url: string, duration: string, durationSeconds: number, format: string }>
  = fs.existsSync(audioMetadataPath) ? fs.readJSONSync(audioMetadataPath) : {}
const frontmatterKnownKeys = new Set([
  'art',
  'audio',
  'availableLocales',
  'backlink',
  'class',
  'date',
  'description',
  'display',
  'draft',
  'duration',
  'excerpt',
  'hashtags',
  'image',
  'items',
  'lang',
  'link',
  'mastodon',
  'originalLocale',
  'place',
  'placeLink',
  'projects',
  'recording',
  'redirect',
  'sources',
  'subtitle',
  'tags',
  'telegram',
  'title',
  'tocAlwaysOn',
  'type',
  'upcoming',
  'updated',
  'wrapperClass',
])

export default defineConfig({
  resolve: {
    alias: [
      { find: '~/', replacement: `${resolve(__dirname, 'src')}/` },
    ],
  },
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      '@vueuse/core',
      'dayjs',
      'dayjs/plugin/localizedFormat',
    ],
  },
  plugins: [
    UnoCSS(),

    VueRouter({
      extensions: ['.vue', '.md'],
      routesFolder: 'pages',
      extendRoute(route) {
        const path = route.components.get('default')
        if (!path)
          return

        if (!path.includes('projects.md') && path.endsWith('.md')) {
          const { data, content } = matter(fs.readFileSync(path, 'utf-8'))
          const frontmatter = normalizeFrontmatter(data, content, path)
          normalizedFrontmatterById.set(resolve(path), frontmatter)

          // Cross-locale aliases for articles
          const articleMatch = getArticleInfo(path)
          if (articleMatch) {
            const { sourceLocale, slug } = articleMatch

            if (slug !== 'index' && !slug.startsWith('[')) {
              frontmatter.originalLocale = sourceLocale
              frontmatter.availableLocales = getAvailableArticleLocales(slug)

              const aliases: string[] = []
              for (const targetLocale of supportedLocales) {
                if (targetLocale === sourceLocale)
                  continue
                const targetFile = resolve(__dirname, `pages/${targetLocale}/articles/${slug}.md`)
                if (!fs.existsSync(targetFile)) {
                  aliases.push(`/${targetLocale}/articles/${slug}`)
                }
              }
              if (aliases.length > 0) {
                route.addAlias(aliases)
              }
            }
          }

          // Validate backlink slug at build time
          if (frontmatter.backlink) {
            const backlinks = Array.isArray(frontmatter.backlink) ? frontmatter.backlink : [frontmatter.backlink]
            for (const backlinkSlug of backlinks) {
              const backlinkExists = supportedLocales.some(loc =>
                fs.existsSync(resolve(__dirname, `pages/${loc}/articles/${backlinkSlug}.md`)),
              )
              if (!backlinkExists)
                warnFrontmatter(`[frontmatter] ${path}: backlink "${backlinkSlug}" does not match any article.`)
            }
          }

          route.addToMeta({
            frontmatter,
          })
        }
      },
    }),

    Vue({
      include: [/\.vue$/, /\.md$/],
    }),

    Markdown({
      include: [/\.md$/, /\.md\?vue$/],
      // Exclude Vue SFC virtual blocks so markdown is only transformed once.
      exclude: [/\.md\?vue&type=/],
      wrapperComponent: id => id.includes('/demo/')
        ? 'WrapperDemo'
        : 'WrapperPost',
      wrapperClasses: (id, code) => code.includes('@layout-full-width')
        ? ''
        : 'prose m-auto slide-enter-content',
      headEnabled: true,
      exportFrontmatter: false,
      exposeFrontmatter: false,
      exposeExcerpt: false,
      markdownItOptions: {
        quotes: '""\'\'',
        breaks: true,
      },
      async markdownItSetup(md) {
        md.use(await MarkdownItShiki({
          themes: {
            dark: 'vitesse-dark',
            light: 'vitesse-light',
          },
          defaultColor: false,
          cssVariablePrefix: '--s-',
          transformers: [
            ...(isDev
              ? []
              : [transformerTwoslash({
                  explicitTrigger: true,
                  renderer: rendererRich(),
                })]),
            transformerNotationDiff(),
            transformerNotationHighlight(),
            transformerNotationWordHighlight(),
          ],
        }))

        md.use(anchor, {
          slugify,
          permalink: anchor.permalink.linkInsideHeader({
            symbol: '#',
            renderAttrs: () => ({ 'aria-hidden': 'true' }),
          }),
        })

        md.use(LinkAttributes, {
          matcher: (link: string) => /^https?:\/\//.test(link),
          attrs: {
            target: '_blank',
            rel: 'noopener',
          },
        })

        md.use(TOC, {
          includeLevel: [1, 2, 3, 4],
          slugify,
          containerHeaderHtml: '<div class="table-of-contents-anchor"><div class="i-ri-menu-2-fill" /></div>',
        })

        md.use(GitHubAlerts)

        // Convert standalone ![alt](src) into <figure><img><figcaption>alt</figcaption></figure>.
        // Triggers when <p> contains a single <img>. If alt text exists, it adds <figcaption>.
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

        // Warn if article images lack alt text
        md.core.ruler.after('image_figures', 'image_alt_check', (state) => {
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

        // ── Sources block: assign IDs to external links ──
        // Assigns ID to external links for sources back-referencing.
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

        // ── Sources block: render the spoiler with back-references ──
        // Renders sources spoiler with back-references.
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
          const localeMatch = id.match(/pages[\\/]([a-z]{2})[\\/]/)
          const locale = localeMatch?.[1] || 'en'
          const titleText: Record<string, string> = { ru: 'Источники', en: 'Sources', es: 'Fuentes' }
          const headerText = `${titleText[locale] || titleText.en}`

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

        // Custom ==highlight== syntax (Obsidian-style mark)
        // Converts ==text== to <mark>text</mark>, no external plugin needed.
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
      },
      frontmatterPreprocess(frontmatter, options, id, defaults) {
        (() => {
          if (!id.endsWith('.md'))
            return
          const normalizedFrontmatter = normalizedFrontmatterById.get(resolve(id))
          if (normalizedFrontmatter)
            Object.assign(frontmatter, normalizedFrontmatter)
          else
            Object.assign(frontmatter, normalizeFrontmatter(frontmatter, '', id))

          const route = basename(id, '.md')
          if (route === 'index' || frontmatter.image || !frontmatter.title)
            return
          const article = getArticleInfo(id)
          const slug = article?.slug || route
          const path = `og/${slug}.png`
          frontmatter.image = `${siteOrigin}/${path}`

          if (queuedOgOutputs.has(path))
            return
          queuedOgOutputs.add(path)
          if (!isDev)
            promises.push(ensureOgImage(id, frontmatter, `public/${path}`))
        })()
        const head = defaults(frontmatter, options)
        return { head, frontmatter }
      },
    }),

    AutoImport({
      imports: [
        'vue',
        VueRouterAutoImports,
        '@vueuse/core',
      ],
    }),

    Components({
      extensions: ['vue', 'md'],
      dts: true,
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      resolvers: [
        IconsResolver({
          componentPrefix: '',
        }),
      ],
    }),

    Inspect(),

    Icons({
      defaultClass: 'inline',
      defaultStyle: 'vertical-align: sub;',
    }),

    SVG({
      svgo: false,
      defaultImport: 'url',
    }),

    Exclude(),

    {
      name: 'await',
      async closeBundle() {
        await Promise.all(promises)
      },
    },
  ],

  build: {
    rollupOptions: {
      onwarn(warning, next) {
        if (warning.code !== 'UNUSED_EXTERNAL_IMPORT')
          next(warning)
      },
    },
  },

  ssgOptions: {
    formatting: 'minify',
    onFinished() {
      // Build the list of excluded routes:
      // draft/dateless articles + always-excluded system routes.
      const articleLocales = ['en', 'ru', 'es'] as const
      const excludedRoutes: string[] = ['/404']

      for (const locale of articleLocales) {
        const dir = resolve(__dirname, `pages/${locale}/articles`)
        if (!fs.existsSync(dir))
          continue
        for (const file of fs.readdirSync(dir)) {
          if (!file.endsWith('.md') || file.startsWith('['))
            continue
          const slug = file.replace(/\.md$/, '')
          const { data } = matter(fs.readFileSync(resolve(dir, file), 'utf-8'))
          if (!isPostVisible(data))
            excludedRoutes.push(`/${locale}/articles/${slug}`)
        }
      }

      generateSitemap({
        hostname: siteOrigin,
        exclude: excludedRoutes,
      })
    },
  },
})

const ogSVg = fs.readFileSync('./scripts/og-template.svg', 'utf-8')

function warnFrontmatter(message: string) {
  if (frontmatterWarnings.has(message))
    return
  frontmatterWarnings.add(message)
  console.warn(message)
}

function getArticleInfo(id: string) {
  const match = id.match(/pages[\\/](?<locale>[a-z]{2})[\\/]articles[\\/](?<slug>[^/\\]+)\.md$/)
  if (!match?.groups)
    return
  return {
    sourceLocale: match.groups.locale,
    slug: match.groups.slug,
  }
}

function getAvailableArticleLocales(slug: string) {
  return supportedLocales.filter(locale =>
    fs.existsSync(resolve(__dirname, `pages/${locale}/articles/${slug}.md`)),
  )
}

function resolveAudioFile(locale: string, slug: string): string | undefined {
  for (const ext of supportedAudioExtensions) {
    const candidate = resolve(__dirname, `public/audio/articles/${locale}/${slug}${ext}`)
    if (fs.existsSync(candidate))
      return `/audio/articles/${locale}/${slug}${ext}`
  }
  return undefined
}

function isRealArticle(id: string) {
  const article = getArticleInfo(id)
  return !!article && article.slug !== 'index' && !article.slug.startsWith('[')
}

function toDurationMinutes(duration: unknown): number | undefined {
  if (typeof duration === 'number' && Number.isFinite(duration))
    return Math.max(1, Math.round(duration))
  if (typeof duration === 'string') {
    const match = duration.trim().match(/^(\d+)(?:\s*min)?$/i)
    if (match)
      return Math.max(1, Number.parseInt(match[1], 10))
  }
  return undefined
}

function estimateReadingMinutes(content: string): number {
  const noCodeFences = content.replace(/```[\s\S]*?```/g, ' ')
  const noInlineCode = noCodeFences.replace(/`[^`]*`/g, ' ')
  const noHtml = noInlineCode.replace(/<[^>]+>/g, ' ')
  const noLinks = noHtml
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

  const words = noLinks.match(/[a-z0-9\u0400-\u04FF]+(?:['’-][a-z0-9\u0400-\u04FF]+)*/gi)?.length || 0
  const cjkChars = noLinks.match(/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g)?.length || 0
  const units = words + cjkChars
  return Math.max(1, Math.ceil(units / 200))
}

function extractExcerpt(content: string, maxLength: number): string {
  let text = content
    // Remove [[toc]] directives
    .replace(/\[\[toc\]\]/gi, '')
    // Remove code fences
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]*`/g, '')
    // Remove HTML tags and Vue components
    .replace(/<[^>]+>/g, '')
    // Remove images
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // Convert links to just text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Remove headings markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquote markers
    .replace(/^>\s?/gm, '')
    // Remove horizontal rules
    .replace(/^-{3,}$/gm, '')
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Remove strikethrough
    .replace(/~~([^~]+)~~/g, '$1')
    // Collapse whitespace
    .replace(/\n{2,}/g, '\n')
    .trim()

  // Take first meaningful lines (skip empty)
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  text = lines.join(' ').trim()

  if (text.length > maxLength) {
    // Cut at last word boundary
    text = text.slice(0, maxLength)
    const lastSpace = text.lastIndexOf(' ')
    if (lastSpace > maxLength * 0.6)
      text = text.slice(0, lastSpace)
    text += '…'
  }

  return text
}

function normalizeFrontmatter(rawFrontmatter: Record<string, any>, content: string, id: string) {
  const frontmatter = { ...rawFrontmatter }

  // Normalize date fields: gray-matter/js-yaml may parse ISO dates into
  // native Date objects.  Serialising a Date through route meta (SSG / SSR)
  // can produce "Invalid Date" strings.  Convert them to ISO strings early.
  for (const key of ['date', 'updated'] as const) {
    if (frontmatter[key] instanceof Date) {
      const d = frontmatter[key] as Date
      frontmatter[key] = Number.isNaN(d.getTime()) ? undefined : d.toISOString()
    }
  }

  if (frontmatter.hashtags && !frontmatter.tags) {
    frontmatter.tags = frontmatter.hashtags
    warnFrontmatter(`[frontmatter] ${id}: "hashtags" is deprecated, use "tags".`)
  }

  if (frontmatter.tags != null) {
    if (!Array.isArray(frontmatter.tags)) {
      warnFrontmatter(`[frontmatter] ${id}: "tags" should be an array of strings.`)
    }
    else {
      frontmatter.tags = frontmatter.tags
        .filter((item: unknown) => typeof item === 'string')
        .map((item: string) => item.trim().replace(/^#+/, ''))
        .filter(Boolean)
    }
  }

  if (frontmatter.duration != null) {
    const minutes = toDurationMinutes(frontmatter.duration)
    if (minutes != null)
      frontmatter.duration = minutes
    else
      warnFrontmatter(`[frontmatter] ${id}: unable to parse "duration" value "${String(frontmatter.duration)}".`)
  }
  else if (isRealArticle(id)) {
    frontmatter.duration = estimateReadingMinutes(content)
  }

  if (frontmatter.audio != null) {
    const article = getArticleInfo(id)

    // Shortcut: `audio: true` → resolve URL and metadata from cache / filesystem
    if (frontmatter.audio === true) {
      if (!article) {
        warnFrontmatter(`[frontmatter] ${id}: "audio: true" is only supported for articles.`)
        frontmatter.audio = undefined
      }
      else {
        const key = `${article.sourceLocale}/${article.slug}`
        const cached = audioMetadata[key]
        if (cached) {
          frontmatter.audio = {
            url: cached.url,
            duration: cached.duration,
          }
        }
        else {
          const audioUrl = resolveAudioFile(article.sourceLocale, article.slug)
          if (audioUrl) {
            frontmatter.audio = { url: audioUrl }
          }
          else {
            warnFrontmatter(`[frontmatter] ${id}: "audio: true" but no audio file found. Run "pnpm run process-audio".`)
            frontmatter.audio = undefined
          }
        }
      }
    }

    const audio = frontmatter.audio
    if (audio && typeof audio === 'object' && !Array.isArray(audio)) {
      // Inject cached duration when not set manually
      if (article && !audio.duration) {
        const key = `${article.sourceLocale}/${article.slug}`
        const cached = audioMetadata[key]
        if (cached?.duration)
          audio.duration = cached.duration
      }

      // Validate URL
      if (typeof audio.url !== 'string' || !audio.url.trim()) {
        warnFrontmatter(`[frontmatter] ${id}: "audio.url" should be a non-empty local path.`)
      }
      else if (/^https?:\/\//i.test(audio.url)) {
        warnFrontmatter(`[frontmatter] ${id}: "audio.url" should be a local path under /audio/articles/.`)
      }

      // Normalize sourceTextUpdatedAt Date
      if (audio.sourceTextUpdatedAt instanceof Date) {
        const d = audio.sourceTextUpdatedAt
        audio.sourceTextUpdatedAt = Number.isNaN(d.getTime()) ? undefined : d.toISOString()
      }
    }
    else if (audio != null) {
      warnFrontmatter(`[frontmatter] ${id}: "audio" should be "true" or an object with a "url" field.`)
    }
  }

  // Auto-generate excerpt from article body (first ~200 chars of clean text)
  if (!frontmatter.excerpt && content && isRealArticle(id)) {
    frontmatter.excerpt = extractExcerpt(content, 400)
  }

  for (const key of Object.keys(frontmatter)) {
    if (!frontmatterKnownKeys.has(key))
      warnFrontmatter(`[frontmatter] ${id}: unknown field "${key}".`)
  }

  return frontmatter
}

function resolveOgSource(id: string) {
  const article = getArticleInfo(id)
  const bases = article
    ? [
        resolve(__dirname, `public/og/articles/${article.slug}`),
        ...supportedLocales.map(locale => resolve(__dirname, `pages/${locale}/articles/${article.slug}`)),
      ]
    : [id.slice(0, -3)]

  const matches: string[] = []
  for (const ext of supportedOgSourceExtensions) {
    for (const base of bases) {
      const candidate = `${base}.${ext}`
      if (fs.existsSync(candidate))
        matches.push(candidate)
    }
  }

  if (matches.length > 1) {
    warnFrontmatter(`[og] ${id}: multiple OG sources found, using ${matches[0]}.`)
  }

  return matches[0]
}

async function copyOrConvertOg(source: string, output: string) {
  await fs.mkdir(dirname(output), { recursive: true })

  if (resolve(source) === resolve(output))
    return

  if (fs.existsSync(output)) {
    const sourceStat = await fs.stat(source)
    const outputStat = await fs.stat(output)
    if (sourceStat.mtimeMs <= outputStat.mtimeMs)
      return
  }

  const extension = extname(source).toLowerCase()
  if (extension === '.png') {
    await fs.copy(source, output)
    return
  }

  await sharp(source)
    .png()
    .toFile(output)
}

async function ensureOgImage(id: string, frontmatter: Record<string, any>, output: string) {
  const source = resolveOgSource(id)
  if (source) {
    await copyOrConvertOg(source, output)
    return
  }

  await generateOg(String(frontmatter.title).replace(/\s-\s.*$/, '').trim(), output)
}

async function generateOg(title: string, output: string) {
  if (fs.existsSync(output))
    return

  await fs.mkdir(dirname(output), { recursive: true })

  const lines = title.trim().split(/(.{0,30})(?:\s|$)/g).filter(Boolean)

  const data: Record<string, string> = {
    line1: escapeSvgText(lines[0] || ''),
    line2: escapeSvgText(lines[1] || ''),
    line3: escapeSvgText(lines[2] || ''),
  }
  const svg = ogSVg.replace(/\{\{([^}]+)\}\}/g, (_, name) => data[name] || '')

  console.log(`Generating ${output}`)
  try {
    await sharp(Buffer.from(svg))
      .resize(1200 * 1.1, 630 * 1.1)
      .png()
      .toFile(output)
  }
  catch (e) {
    console.error('Failed to generate og image', e)
  }
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

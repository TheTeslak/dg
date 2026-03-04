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
import MarkdownItMagicLink from 'markdown-it-magic-link'
// @ts-expect-error missing types
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
import SVG from 'vite-svg-loader'
import { slugify } from './scripts/slugify'

const promises: Promise<any>[] = []
const frontmatterWarnings = new Set<string>()
const queuedOgOutputs = new Set<string>()
const normalizedFrontmatterById = new Map<string, Record<string, any>>()
const supportedLocales = ['en', 'ru', 'es'] as const
const supportedOgSourceExtensions = ['avif', 'webp', 'png', 'jpg', 'jpeg'] as const
const frontmatterKnownKeys = new Set([
  'art',
  'class',
  'date',
  'description',
  'display',
  'draft',
  'duration',
  'hashtags',
  'image',
  'inperson',
  'items',
  'lang',
  'link',
  'mastodon',
  'originalLocale',
  'place',
  'placeLink',
  'platform',
  'projects',
  'radio',
  'recording',
  'redirect',
  'subtitle',
  'tags',
  'telegram',
  'title',
  'tocAlwaysOn',
  'type',
  'upcoming',
  'video',
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
            transformerTwoslash({
              explicitTrigger: true,
              renderer: rendererRich(),
            }),
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

        md.use(MarkdownItMagicLink, {
          linksMap: {
            'NuxtLabs': { link: 'https://nuxtlabs.com', imageUrl: 'https://nuxtlabs.com/nuxt.png' },
            'Vitest': 'https://github.com/vitest-dev/vitest',
            'Slidev': 'https://github.com/slidevjs/slidev',
            'VueUse': 'https://github.com/vueuse/vueuse',
            'UnoCSS': 'https://github.com/unocss/unocss',
            'Elk': 'https://github.com/elk-zone/elk',
            'Type Challenges': 'https://github.com/type-challenges/type-challenges',
            'Vue': 'https://github.com/vuejs/core',
            'Nuxt': 'https://github.com/nuxt/nuxt',
            'Vite': 'https://github.com/vitejs/vite',
            'Shiki': 'https://github.com/shikijs/shiki',
            'Twoslash': 'https://github.com/twoslashes/twoslash',
            'ESLint Stylistic': 'https://github.com/eslint-stylistic/eslint-stylistic',
            'Unplugin': 'https://github.com/unplugin',
            'Nuxt DevTools': 'https://github.com/nuxt/devtools',
            'Vite PWA': 'https://github.com/vite-pwa',
            'i18n Ally': 'https://github.com/lokalise/i18n-ally',
            'ESLint': 'https://github.com/eslint/eslint',
            'Astro': 'https://github.com/withastro/astro',
            'TwoSlash': 'https://github.com/twoslashes/twoslash',
            'Anthony Fu Collective': { link: 'https://opencollective.com/antfu', imageUrl: 'https://github.com/antfu-collective.png' },
            'Netlify': { link: 'https://netlify.com', imageUrl: 'https://github.com/netlify.png' },
            'Stackblitz': { link: 'https://stackblitz.com', imageUrl: 'https://github.com/stackblitz.png' },
            'Vercel': { link: 'https://vercel.com', imageUrl: 'https://github.com/vercel.png' },
          },
          imageOverrides: [
            ['https://github.com/vuejs/core', 'https://vuejs.org/logo.svg'],
            ['https://github.com/nuxt/nuxt', 'https://nuxt.com/assets/design-kit/icon-green.svg'],
            ['https://github.com/vitejs/vite', 'https://vitejs.dev/logo.svg'],
            ['https://github.com/sponsors', 'https://github.com/github.png'],
            ['https://github.com/sponsors/antfu', 'https://github.com/github.png'],
            ['https://nuxtlabs.com', 'https://github.com/nuxtlabs.png'],
            [/opencollective\.com\/vite/, 'https://github.com/vitejs.png'],
            [/opencollective\.com\/elk/, 'https://github.com/elk-zone.png'],
          ],
        })

        md.use(GitHubAlerts)
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
          frontmatter.image = `https://antfu.me/${path}`

          if (queuedOgOutputs.has(path))
            return
          queuedOgOutputs.add(path)
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

  const latinWords = noLinks.match(/[a-z0-9]+(?:['’-][a-z0-9]+)*/gi)?.length || 0
  const cjkChars = noLinks.match(/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g)?.length || 0
  const units = latinWords + cjkChars
  return Math.max(1, Math.ceil(units / 200))
}

function normalizeFrontmatter(rawFrontmatter: Record<string, any>, content: string, id: string) {
  const frontmatter = { ...rawFrontmatter }

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
    line1: lines[0],
    line2: lines[1],
    line3: lines[2],
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

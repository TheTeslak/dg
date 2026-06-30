import { resolve } from 'node:path'
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
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import Markdown from 'unplugin-vue-markdown/vite'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import Exclude from 'vite-plugin-optimize-exclude'
import SVG from 'vite-svg-loader'
import { VueRouterAutoImports } from 'vue-router/unplugin'
import VueRouter from 'vue-router/vite'
import { getArticleFallbackPaths, getArticleFallbackSource, getArticleInfo, getArticleLocaleStates } from './build/article'
import { supportedLocales } from './build/constants'
import { normalizeFrontmatter, warnFrontmatter } from './build/frontmatter'
import { registerCustomPlugins } from './build/markdown-plugins'
import { generateSeoFiles } from './build/seo'
import { slugify } from './scripts/slugify'
import { getArticlePath } from './src/logics/article-path'
import { siteOrigin } from './src/logics/site'
import 'vite-ssg'

const isDev = process.env.NODE_ENV !== 'production'
const normalizedFrontmatterById = new Map<string, Record<string, any>>()

function useMarkdownPlugin(md: { use: (...args: any[]) => unknown }, plugin: unknown, options?: unknown) {
  if (options === undefined)
    md.use(plugin)
  else
    md.use(plugin, options)
}

function getArticleRouteConflict(locale: string, slug: string) {
  const candidates = [
    `pages/${locale}/${slug}.md`,
    `pages/${locale}/${slug}.vue`,
    `pages/${locale}/${slug}/index.md`,
    `pages/${locale}/${slug}/index.vue`,
  ]

  return candidates.find(candidate => fs.existsSync(resolve(__dirname, candidate)))
}

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
      exclude: ['pages/AGENTS.md', 'pages/**/AGENTS.md'],
      extendRoute(route) {
        const path = route.components.get('default')
        if (!path)
          return

        if (!path.includes('projects.md') && path.endsWith('.md')) {
          const { data, content } = matter(fs.readFileSync(path, 'utf-8'))
          const frontmatter = normalizeFrontmatter(data, content, path)
          normalizedFrontmatterById.set(resolve(path), frontmatter)
          const routeMeta: Record<string, any> = { frontmatter }
          const normalizedPath = path.replace(/\\/g, '/')

          if (normalizedPath.endsWith('/[...404].md') || normalizedPath.endsWith('/404.md'))
            routeMeta.isNotFound = true

          // The URL keeps the site locale while untranslated content keeps its source language.
          const articleMatch = getArticleInfo(path)
          if (articleMatch) {
            const { sourceLocale, slug } = articleMatch

            if (slug !== 'index' && !slug.startsWith('[')) {
              const articlePath = getArticlePath(sourceLocale, slug)
              const conflict = getArticleRouteConflict(sourceLocale, slug)
              if (conflict)
                warnFrontmatter(`[routes] ${path}: article route "${articlePath}" conflicts with ${conflict}.`)

              route.path = articlePath
              frontmatter.originalLocale = sourceLocale
              const localeStates = getArticleLocaleStates(slug)
              const physicalLocales = localeStates.map(state => state.locale)
              const routableLocales = localeStates
                .filter(state => state.routable)
                .map(state => state.locale)
              const availableLocales = localeStates
                .filter(state => state.indexable)
                .map(state => state.locale)
              frontmatter.availableLocales = availableLocales
              routeMeta.isArticle = true
              routeMeta.articleSlug = slug
              routeMeta.articleLocale = sourceLocale

              const aliases: string[] = []
              for (const targetLocale of supportedLocales) {
                if (targetLocale === sourceLocale)
                  continue
                if (!physicalLocales.includes(targetLocale)
                  && getArticleFallbackSource(targetLocale, routableLocales) === sourceLocale) {
                  aliases.push(getArticlePath(targetLocale, slug))
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
            ...routeMeta,
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
      headEnabled: false,
      exportFrontmatter: false,
      exposeFrontmatter: false,
      exposeExcerpt: false,
      markdownOptions: {
        quotes: '""\'\'',
        breaks: true,
      },
      async markdownSetup(md) {
        useMarkdownPlugin(md, await MarkdownItShiki({
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

        useMarkdownPlugin(md, anchor, {
          slugify,
          permalink: anchor.permalink.linkInsideHeader({
            symbol: '#',
            renderAttrs: () => ({ 'aria-hidden': 'true' }),
          }),
        })

        useMarkdownPlugin(md, LinkAttributes, {
          matcher: (link: string) => /^https?:\/\//.test(link),
          attrs: {
            target: '_blank',
            rel: 'noopener',
          },
        })

        useMarkdownPlugin(md, TOC, {
          includeLevel: [1, 2, 3, 4],
          slugify,
          containerHeaderHtml: '<div class="table-of-contents-anchor"><div class="i-ri-menu-2-fill" /></div>',
        })

        useMarkdownPlugin(md, GitHubAlerts)

        // Register all custom markdown-it plugins (image figures, alt check,
        // source back-references, sources block, ==mark== highlight)
        registerCustomPlugins(md as unknown as import('markdown-it').default, normalizedFrontmatterById)
      },
      frontmatterPreprocess(frontmatter, options, id, defaults) {
        if (id.endsWith('.md')) {
          const normalizedFrontmatter = normalizedFrontmatterById.get(resolve(id))
          if (normalizedFrontmatter)
            Object.assign(frontmatter, normalizedFrontmatter)
          else
            Object.assign(frontmatter, normalizeFrontmatter(frontmatter, '', id))
        }
        const head = defaults(frontmatter, options)
        const finalHead = { ...head }
        if (finalHead.title && !finalHead.title.includes('Teslak')) {
          finalHead.title = `${finalHead.title} · Teslak`
        }

        return { head: finalHead, frontmatter }
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
    includedRoutes(paths) {
      const staticPaths = paths.filter(path => !path.includes(':'))
      return [...new Set([...staticPaths, ...getArticleFallbackPaths()])]
    },
    async onFinished() {
      await generateSeoFiles({ siteOrigin })
    },
  },
})

import { basename, resolve } from 'node:path'
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
import { VueRouterAutoImports } from 'unplugin-vue-router'
import VueRouter from 'unplugin-vue-router/vite'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import Exclude from 'vite-plugin-optimize-exclude'
import generateSitemap from 'vite-ssg-sitemap'
import SVG from 'vite-svg-loader'
import { getArticleInfo, getAvailableArticleLocales } from './build/article'
import { supportedLocales } from './build/constants'
import { normalizeFrontmatter, warnFrontmatter } from './build/frontmatter'
import { registerCustomPlugins } from './build/markdown-plugins'
import { ensureOgImage } from './build/og'
import { slugify } from './scripts/slugify'
import { isPostVisible } from './src/logics/post-visibility'
import { siteOrigin } from './src/logics/site'
import 'vite-ssg'

const isDev = process.env.NODE_ENV !== 'production'
const promises: Promise<any>[] = []
const queuedOgOutputs = new Set<string>()
const normalizedFrontmatterById = new Map<string, Record<string, any>>()

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

        // Register all custom markdown-it plugins (image figures, alt check,
        // source back-references, sources block, ==mark== highlight)
        registerCustomPlugins(md as import('markdown-it').default, normalizedFrontmatterById)
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
        const finalHead = { ...head }
        if (finalHead.title && finalHead.title !== 'Teslak Blog') {
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
      const excludedRoutes: string[] = ['/404']

      for (const locale of supportedLocales) {
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

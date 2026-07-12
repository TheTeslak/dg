/**
 * Static renderers for the custom components used inside plain `.md`
 * articles. In the original Vue project every markdown file compiled to a
 * Vue component, so tags like `<TranslationStats />` resolved globally.
 * Astro's `<Content components={...}>` mapping only works for MDX, so plain
 * markdown needs this rehype pass (running after `rehype-raw`) that replaces
 * the custom elements with the same markup the `src/components/mdx/*.astro`
 * components produce. Interactive behavior lives in
 * `src/scripts/mdx-interactions.ts`, styles in `src/styles/mdx-components.css`.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'unified'
import type { Element, ElementContent, Properties, Root } from 'hast'
import { visit } from 'unist-util-visit'
import matter from 'gray-matter'
import { localeConfig, supportedLocales, isSupportedLocale, type SupportedLocale } from '../locales/config.ts'
import { isPostVisible } from './post-visibility.ts'

function h(tagName: string, properties: Properties = {}, children: ElementContent[] = []): Element {
  return { type: 'element', tagName, properties, children }
}

function text(value: string): ElementContent {
  return { type: 'text', value }
}

function attr(node: Element, name: string): string | undefined {
  const props = node.properties ?? {}
  for (const key of [name, `:${name}`]) {
    const value = (props as Record<string, unknown>)[key]
    if (value == null)
      continue
    if (Array.isArray(value))
      return value.join(' ')
    return String(value)
  }
  return undefined
}

function listAttr(node: Element, name: string): string[] {
  const raw = attr(node, name)
  if (!raw)
    return []
  const trimmed = raw.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed.replace(/'/g, '"'))
      if (Array.isArray(parsed))
        return parsed.map(String)
    }
    catch {}
  }
  return trimmed.split(',').map(s => s.trim()).filter(Boolean)
}

// ---------------------------------------------------------------------------
// Content statistics for <TranslationStats /> — computed from the content
// folder itself so the rendered numbers always match the published articles.
// ---------------------------------------------------------------------------

interface LocaleStat {
  locale: SupportedLocale
  name: string
  count: number
  total: number
  percentage: number
}

let statsCache: LocaleStat[] | undefined

function getTranslationStats(): LocaleStat[] {
  if (statsCache)
    return statsCache

  const contentDir = resolve('src/content/articles')
  const physical: { slug: string, locale: SupportedLocale }[] = []
  for (const locale of supportedLocales) {
    const dir = resolve(contentDir, locale)
    if (!existsSync(dir))
      continue
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx'))
        continue
      const { data } = matter(readFileSync(resolve(dir, file), 'utf8'))
      if (!isPostVisible(data))
        continue
      physical.push({ slug: file.replace(/\.[^.]+$/, ''), locale })
    }
  }

  const total = new Set(physical.map(a => a.slug)).size
  statsCache = total === 0
    ? []
    : supportedLocales
        .map((locale) => {
          const count = physical.filter(a => a.locale === locale).length
          return {
            locale,
            name: localeConfig[locale].nativeName,
            count,
            total,
            percentage: Math.round((count / total) * 100),
          }
        })
        .sort((a, b) => b.percentage - a.percentage)
  return statsCache
}

const CIRCUMFERENCE = 2 * Math.PI * 16

function renderTranslationStats(): Element | undefined {
  const stats = getTranslationStats()
  if (!stats.length)
    return undefined
  return h('div', { className: ['translation-stats', 'grid', 'grid-cols-1', 'md:grid-cols-3', 'gap-[2px]', 'my-6'] }, stats.map(item =>
    h('div', { className: ['translation-stats-item', 'pl-4', 'pr-5', 'py-3', 'flex', 'items-center', 'justify-between'] }, [
      h('span', { className: ['font-sans', 'font-medium'] }, [text(item.name)]),
      h('div', { className: ['flex', 'items-center', 'gap-3'] }, [
        h('span', { className: ['font-sans', 'text-right'] }, [text(`${item.percentage}%`)]),
        h('svg', { className: ['w-5', 'h-5', 'flex-shrink-0'], viewBox: '0 0 36 36', style: 'transform: rotate(-90deg)' }, [
          h('circle', { cx: '18', cy: '18', r: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': '3.5', opacity: '0.15' }),
          h('circle', {
            cx: '18',
            cy: '18',
            r: '16',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '3.5',
            'stroke-linecap': 'round',
            'stroke-dasharray': String(CIRCUMFERENCE),
            'stroke-dashoffset': String(CIRCUMFERENCE - (CIRCUMFERENCE * item.percentage) / 100),
          }),
        ]),
      ]),
    ])))
}

// ---------------------------------------------------------------------------
// Article link cards for <ArticleLinks links="slug-a, slug-b" />
// ---------------------------------------------------------------------------

function renderArticleLinks(node: Element, locale: SupportedLocale): Element | undefined {
  const links = listAttr(node, 'links')
  if (!links.length)
    return undefined

  const cards: ElementContent[] = []
  for (const slug of links) {
    const file = ['md', 'mdx']
      .map(ext => resolve('src/content/articles', locale, `${slug}.${ext}`))
      .find(existsSync)
    if (!file)
      continue
    const { data } = matter(readFileSync(file, 'utf8'))
    const title = data.title || data.display || slug
    cards.push(h('a', { href: `/${locale}/${slug}`, className: ['article-link-card'] }, [
      h('span', { className: ['article-link-title'] }, [text(title)]),
      h('span', { className: ['article-link-excerpt'] }, [text(data.description || data.excerpt || title)]),
    ]))
  }
  if (!cards.length)
    return undefined
  return h('div', { className: ['article-links'] }, cards)
}

// ---------------------------------------------------------------------------
// Simple presentational components
// ---------------------------------------------------------------------------

function renderYouTubeEmbed(node: Element): Element {
  const id = attr(node, 'id') ?? ''
  const title = attr(node, 'title') ?? 'YouTube video'
  const poster = attr(node, 'poster') ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  const start = attr(node, 'start')
  const src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${start ? `&start=${start}` : ''}`
  return h('div', { className: ['youtube-embed'], 'data-youtube-embed': '', 'data-src': src, role: 'region', 'aria-label': title }, [
    h('button', { type: 'button', className: ['youtube-poster'], 'data-youtube-trigger': '', 'aria-label': `Play video: ${title}` }, [
      h('img', { src: poster, alt: '', loading: 'lazy', decoding: 'async' }),
      h('span', { className: ['youtube-play'], 'aria-hidden': 'true' }, [
        h('svg', { viewBox: '0 0 60 60', width: '60', height: '60' }, [
          h('polygon', { fill: 'white', points: '22,15 22,45 47,30' }),
          h('circle', { cx: '30', cy: '30', r: '28', fill: 'none', stroke: 'rgba(255,255,255,0.4)', 'stroke-width': '2' }),
        ]),
      ]),
    ]),
  ])
}

function renderTweet(node: Element): Element {
  const url = attr(node, 'url') ?? '#'
  const author = attr(node, 'author')
  const handle = attr(node, 'handle')
  const avatar = attr(node, 'avatar')
  const date = attr(node, 'date')
  const head: ElementContent[] = []
  if (avatar)
    head.push(h('img', { className: ['tweet-avatar'], src: avatar, alt: '', loading: 'lazy', decoding: 'async' }))
  const meta: ElementContent[] = []
  if (author)
    meta.push(h('div', { className: ['tweet-author'] }, [text(author)]))
  if (handle)
    meta.push(h('div', { className: ['tweet-handle'] }, [text(`@${handle}`)]))
  head.push(h('div', { className: ['tweet-meta'] }, meta))
  head.push(h('span', { className: ['tweet-icon', 'i-simple-icons-x'], 'aria-hidden': 'true' }))

  const children: ElementContent[] = [
    h('div', { className: ['tweet-head'] }, head),
    h('div', { className: ['tweet-body'] }, node.children),
  ]
  if (date)
    children.push(h('time', { className: ['tweet-date'], dateTime: date }, [text(date)]))
  return h('a', { className: ['tweet-card'], href: url, target: '_blank', rel: ['noopener', 'noreferrer'] }, children)
}

function renderGitHubLink(node: Element): Element {
  const repo = attr(node, 'repo') ?? ''
  const name = attr(node, 'name') || (repo.startsWith('teslak/') ? repo.slice(7) : repo)
  return h('span', { className: ['whitespace-nowrap'] }, [
    h('span', { className: ['i-carbon-logo-github', 'inline-block', 'vertical-mid'], 'aria-hidden': 'true' }),
    h('a', {
      className: ['opacity-70', 'ml-1', 'font-mono', 'hover:opacity-100', 'transition-opacity', 'duration-200'],
      href: `https://github.com/${repo}`,
      target: '_blank',
      rel: ['noopener'],
    }, [text(name)]),
  ])
}

function renderTextCopy(node: Element): Element {
  const value = attr(node, 'value') ?? ''
  const label = node.children.length ? node.children : [text(value)]
  return h('button', { type: 'button', className: ['text-copy'], 'data-text-copy': '', 'data-value': value, 'aria-label': 'Copy' }, [
    h('span', { className: ['text-copy-value'] }, label),
    h('span', { className: ['text-copy-icon', 'i-ri-links-line'], 'aria-hidden': 'true' }),
    h('span', { className: ['text-copy-feedback', 'i-ri-check-line'], 'aria-hidden': 'true' }),
  ])
}

function renderCalCom(node: Element): Element {
  const link = attr(node, 'link') ?? ''
  const label = attr(node, 'label') ?? 'Let\'s chat'
  return h('a', {
    className: ['cal-com-btn'],
    href: `https://cal.com/${link}`,
    target: '_blank',
    rel: ['noopener', 'noreferrer'],
    'data-cal-link': link,
  }, [
    h('span', { className: ['i-ri-calendar-event-line'], 'aria-hidden': 'true' }),
    h('span', {}, [text(label)]),
  ])
}

function renderMediaCard(node: Element): Element {
  const variant = attr(node, 'variant') ?? 'aside'
  const image = attr(node, 'image') ?? ''
  const title = attr(node, 'title') ?? ''
  const subtitle = attr(node, 'subtitle')
  const description = attr(node, 'description')
  const ratio = attr(node, 'ratio')

  const figure = h('div', {
    className: ['media-card-figure', ...(ratio ? ['has-ratio'] : [])],
    ...(ratio ? { style: `aspect-ratio: ${ratio}` } : {}),
  }, [h('img', { src: image, alt: title })])

  const title_ = h('div', { className: ['media-card-title'] }, [text(title)])
  const subtitle_ = subtitle ? h('div', { className: ['media-card-subtitle'] }, [text(subtitle)]) : undefined

  if (variant === 'float') {
    return h('div', { className: ['media-card', 'media-card--float'] }, [
      h('div', { className: ['media-card-float-block'] }, [
        figure,
        h('div', { className: ['media-card-meta'] }, [title_, ...(subtitle_ ? [subtitle_] : [])]),
      ]),
      ...node.children,
    ])
  }

  return h('div', { className: ['media-card', 'media-card--aside'] }, [
    figure,
    h('div', { className: ['media-card-info'] }, [
      title_,
      ...(subtitle_ ? [subtitle_] : []),
      ...(description ? [h('div', { className: ['media-card-desc'] }, [text(description)])] : []),
      ...node.children,
    ]),
  ])
}

function renderPostNoticeBanner(node: Element, locale: SupportedLocale): Element {
  const originalLocale = (attr(node, 'originalLocale') ?? attr(node, 'original-locale') ?? 'en').toUpperCase()
  const rawIsDraft = attr(node, 'isDraft') ?? attr(node, 'is-draft')
  const isDraft = rawIsDraft === 'true' || rawIsDraft === ''

  const draftText: Record<string, string> = {
    en: 'This is a draft post, the content may be incomplete. Please check back later.',
    ru: 'Это черновик — содержимое может быть неполным. Загляните позже.',
    es: 'Este es un borrador: el contenido puede estar incompleto. Vuelve más tarde.',
    pt: 'Este é um rascunho — o conteúdo pode estar incompleto. Volte mais tarde.',
    de: 'Dies ist ein Entwurf — der Inhalt kann unvollständig sein. Schau später wieder vorbei.',
    fr: 'Ceci est un brouillon — le contenu peut être incomplet. Revenez plus tard.',
  }
  const noticeText: Record<string, string> = {
    en: `Not yet translated, showing ${originalLocale} version`,
    ru: `Ещё не переведена, показана ${originalLocale} версия`,
    es: `Aún no traducido, mostrando la versión en ${originalLocale}`,
    pt: `Ainda não traduzido; exibindo a versão em ${originalLocale}`,
    de: `Noch nicht übersetzt; die Version auf ${originalLocale} wird angezeigt`,
    fr: `Pas encore traduit ; affichage de la version en ${originalLocale}`,
  }
  const dict = isDraft ? draftText : noticeText
  const message = dict[locale] ?? dict.en

  return h('div', { className: ['prose', 'm-auto', 'mb-8'] }, [
    h('div', { className: ['post-notice-banner', 'slide-enter', ...(isDraft ? ['is-draft'] : [])] }, isDraft
      ? [text(message)]
      : [h('span', { className: ['i-ri-translate-2'], 'aria-hidden': 'true' }), text(message)]),
  ])
}

// ---------------------------------------------------------------------------

const rehypeComponents: Plugin<[], Root> = () => {
  return (tree, file) => {
    const filePath = String(file?.path ?? file?.history?.[0] ?? '')
    const localeMatch = filePath.match(/articles[\\/](\w+)[\\/]/)
    const locale: SupportedLocale = localeMatch && isSupportedLocale(localeMatch[1]) ? localeMatch[1] : 'en'

    visit(tree, 'element', (node: Element, index, parent) => {
      if (!parent || typeof index !== 'number')
        return

      let replacement: Element | undefined
      switch (node.tagName) {
        case 'translationstats':
          replacement = renderTranslationStats()
          break
        case 'articlelinks':
          replacement = renderArticleLinks(node, locale)
          break
        case 'youtubeembed':
          replacement = renderYouTubeEmbed(node)
          break
        case 'tweet':
          replacement = renderTweet(node)
          break
        case 'githublink':
          replacement = renderGitHubLink(node)
          break
        case 'textcopy':
          replacement = renderTextCopy(node)
          break
        case 'calcom':
          replacement = renderCalCom(node)
          break
        case 'mediacard':
          replacement = renderMediaCard(node)
          break
        case 'postnoticebanner':
          replacement = renderPostNoticeBanner(node, locale)
          break
        case 'photoshowcase':
          // Photo assets are managed separately (see scripts/sync-photos.ts);
          // the showcase only appears in the hidden template draft.
          parent.children.splice(index, 1)
          return index
        default:
          return
      }

      if (replacement) {
        parent.children.splice(index, 1, replacement)
        return index + 1
      }
      parent.children.splice(index, 1)
      return index
    })
  }
}

export default rehypeComponents

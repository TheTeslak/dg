import type { FeedOptions, Item } from 'feed'
import { dirname } from 'node:path'
import fg from 'fast-glob'
import { Feed } from 'feed'
import fs from 'fs-extra'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import { isPostVisible } from '../src/logics/post-visibility'

const DOMAIN = 'https://teslak.me'
const AUTHOR = {
  name: 'Teslak',
  email: 'hi@teslak.me',
  link: DOMAIN,
}
const markdown = MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
})

const SUPPORTED_LOCALES = ['en', 'ru', 'es'] as const

function normalizeFeedAudio(audio: unknown) {
  if (!audio || typeof audio !== 'object' || Array.isArray(audio))
    return undefined

  const value = audio as Record<string, unknown>
  const url = value.url
  if (typeof url !== 'string' || !url.trim())
    return undefined

  return {
    ...value,
    url: url.startsWith('/') ? DOMAIN + url : url,
  }
}

async function run() {
  for (const locale of SUPPORTED_LOCALES) {
    await buildLocaleFeed(locale)
  }
}

async function buildLocaleFeed(locale: string) {
  const files = await fg(`pages/${locale}/articles/*.md`)

  const localeTitles: Record<string, string> = {
    en: 'Teslak',
    ru: 'Teslak (Русский)',
    es: 'Teslak (Español)',
  }

  const localeDescriptions: Record<string, string> = {
    en: 'Teslak\'s Blog',
    ru: 'Блог Teslak',
    es: 'Blog de Teslak',
  }

  const feedName = locale === 'en' ? 'feed' : `feed-${locale}`
  const feedUrl = `${DOMAIN}/${feedName}`

  const options: FeedOptions = {
    title: localeTitles[locale] || localeTitles.en,
    description: localeDescriptions[locale] || localeDescriptions.en,
    id: `${DOMAIN}/${locale}/`,
    link: `${DOMAIN}/${locale}/`,
    language: locale,
    copyright: 'CC BY-NC-SA 4.0 2021 © Teslak',
    feedLinks: {
      json: `${feedUrl}.json`,
      atom: `${feedUrl}.atom`,
      rss: `${feedUrl}.xml`,
    },
  }

  const posts: any[] = (
    await Promise.all(
      files
        .filter(i => !i.includes('index') && !i.includes('[...'))
        .map(async (i) => {
          const raw = await fs.readFile(i, 'utf-8')
          const { data, content } = matter(raw)

          // Skip posts that are not publicly visible.
          if (!isPostVisible(data))
            return

          const html = markdown.render(content)
            .replace('src="/', `src="${DOMAIN}/`)

          if (data.image?.startsWith('/'))
            data.image = DOMAIN + data.image

          const item = {
            ...data,
            date: new Date(data.date),
            content: html,
            author: [AUTHOR],
            link: DOMAIN + i.replace(/^pages(.+)\.md$/, '$1'),
          } as Item
          const audio = normalizeFeedAudio(data.audio)
          if (audio)
            item.audio = audio
          else
            delete item.audio

          return item
        }),
    ))
    .filter(Boolean)

  posts.sort((a, b) => +new Date(b.date) - +new Date(a.date))

  await writeFeed(feedName, options, posts)

  console.log(`[RSS] ${locale.toUpperCase()}: ${posts.length} posts → dist/${feedName}.xml`)
}

async function writeFeed(name: string, options: FeedOptions, items: Item[]) {
  options.author = AUTHOR
  options.image = 'https://teslak.me/avatar.png'
  options.favicon = 'https://teslak.me/logo.png'

  const feed = new Feed(options)

  items.forEach(item => feed.addItem(item))

  await fs.ensureDir(dirname(`./dist/${name}`))
  await fs.writeFile(`./dist/${name}.xml`, feed.rss2(), 'utf-8')
  await fs.writeFile(`./dist/${name}.atom`, feed.atom1(), 'utf-8')
  await fs.writeFile(`./dist/${name}.json`, feed.json1(), 'utf-8')
}

run()

import type { FeedOptions, Item } from 'feed'
import { dirname } from 'node:path'
import fg from 'fast-glob'
import { Feed } from 'feed'
import fs from 'fs-extra'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import { isPostVisible } from '../src/logics/post-visibility'

const DOMAIN = 'https://antfu.me'
const AUTHOR = {
  name: 'Anthony Fu',
  email: 'hi@antfu.me',
  link: DOMAIN,
}
const markdown = MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
})

const SUPPORTED_LOCALES = ['en', 'ru', 'es'] as const

async function run() {
  for (const locale of SUPPORTED_LOCALES) {
    await buildLocaleFeed(locale)
  }
}

async function buildLocaleFeed(locale: string) {
  const files = await fg(`pages/${locale}/articles/*.md`)

  const localeTitles: Record<string, string> = {
    en: 'Anthony Fu',
    ru: 'Anthony Fu (Русский)',
    es: 'Anthony Fu (Español)',
  }

  const localeDescriptions: Record<string, string> = {
    en: 'Anthony Fu\'s Blog',
    ru: 'Блог Anthony Fu',
    es: 'Blog de Anthony Fu',
  }

  const feedName = locale === 'en' ? 'feed' : `feed-${locale}`
  const feedUrl = `${DOMAIN}/${feedName}`

  const options: FeedOptions = {
    title: localeTitles[locale] || localeTitles.en,
    description: localeDescriptions[locale] || localeDescriptions.en,
    id: `${DOMAIN}/${locale}/`,
    link: `${DOMAIN}/${locale}/`,
    language: locale,
    copyright: 'CC BY-NC-SA 4.0 2021 © Anthony Fu',
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

          return {
            ...data,
            date: new Date(data.date),
            content: html,
            author: [AUTHOR],
            link: DOMAIN + i.replace(/^pages(.+)\.md$/, '$1'),
          }
        }),
    ))
    .filter(Boolean)

  posts.sort((a, b) => +new Date(b.date) - +new Date(a.date))

  await writeFeed(feedName, options, posts)

  console.log(`[RSS] ${locale.toUpperCase()}: ${posts.length} posts → dist/${feedName}.xml`)
}

async function writeFeed(name: string, options: FeedOptions, items: Item[]) {
  options.author = AUTHOR
  options.image = 'https://antfu.me/avatar.png'
  options.favicon = 'https://antfu.me/logo.png'

  const feed = new Feed(options)

  items.forEach(item => feed.addItem(item))

  await fs.ensureDir(dirname(`./dist/${name}`))
  await fs.writeFile(`./dist/${name}.xml`, feed.rss2(), 'utf-8')
  await fs.writeFile(`./dist/${name}.atom`, feed.atom1(), 'utf-8')
  await fs.writeFile(`./dist/${name}.json`, feed.json1(), 'utf-8')
}

run()

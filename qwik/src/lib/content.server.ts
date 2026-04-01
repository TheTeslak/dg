import type {
  LocaleOverview,
  MarkdownPageDocument,
  MarkdownPageFrontmatter,
  PostDocument,
  PostFrontmatter,
  PostSummary,
} from './content-shared'
import type { SupportedLocale } from './locales'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import { isSupportedLocale } from './locales'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const pagesRoot = resolve(repoRoot, 'pages')
const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})
const simplePageSlugs = new Set(['bar', 'bookmarks', 'use'])

export async function getHomeOverview(): Promise<LocaleOverview[]> {
  return Promise.all(
    (['en', 'ru', 'es'] as const).map(async (locale) => {
      const articles = await listPosts(locale, 'blog')
      const notes = await listPosts(locale, 'note')
      return {
        locale,
        articles: articles.length,
        notes: notes.length,
        latestArticles: articles.slice(0, 4),
        latestNotes: notes.slice(0, 4),
      }
    }),
  )
}

export async function getLocaleOverview(
  locale: SupportedLocale,
): Promise<LocaleOverview> {
  const articles = await listPosts(locale, 'blog')
  const notes = await listPosts(locale, 'note')
  return {
    locale,
    articles: articles.length,
    notes: notes.length,
    latestArticles: articles.slice(0, 6),
    latestNotes: notes.slice(0, 6),
  }
}

export async function listPosts(
  locale: SupportedLocale,
  type?: 'blog' | 'note',
): Promise<PostSummary[]> {
  const files = await fg(resolve(pagesRoot, locale, 'articles', '*.md'))
  const posts: Array<PostSummary | null> = await Promise.all(
    files.map(async (file) => {
      const slug = file.split(/[/\\]/).pop()?.replace(/\.md$/, '')
      if (!slug)
        return null

      const raw = await readFile(file, 'utf-8')
      const parsed = matter(raw)
      const frontmatter = parsed.data as PostFrontmatter

      if (!isPostVisible(frontmatter))
        return null
      if (type && !hasType(frontmatter.type, type))
        return null
      if (!frontmatter.title || !frontmatter.date)
        return null

      const post: PostSummary = {
        slug,
        locale,
        title: frontmatter.title,
        date: frontmatter.date,
        updated: frontmatter.updated,
        description: frontmatter.description,
        duration: frontmatter.duration,
        lang: frontmatter.lang,
        redirect: frontmatter.redirect,
        type: frontmatter.type,
        url: frontmatter.redirect || `/${locale}/articles/${slug}`,
      }

      return post
    }),
  )

  return posts
    .filter((post): post is PostSummary => post !== null)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
}

export async function getPost(
  locale: string,
  slug: string,
): Promise<PostDocument | null> {
  if (!isSupportedLocale(locale))
    return null

  const file = resolve(pagesRoot, locale, 'articles', `${slug}.md`)
  try {
    const raw = await readFile(file, 'utf-8')
    const parsed = matter(raw)
    const frontmatter = parsed.data as PostFrontmatter
    if (!frontmatter.title || !frontmatter.date)
      return null

    return {
      slug,
      locale,
      title: frontmatter.title,
      date: frontmatter.date,
      updated: frontmatter.updated,
      description: frontmatter.description,
      duration: frontmatter.duration,
      lang: frontmatter.lang,
      redirect: frontmatter.redirect,
      type: frontmatter.type,
      url: frontmatter.redirect || `/${locale}/articles/${slug}`,
      html: markdown.render(parsed.content),
      raw: parsed.content,
    }
  }
  catch {
    return null
  }
}

export async function getPage(
  locale: string,
  slug: string,
): Promise<MarkdownPageDocument | null> {
  if (!isSupportedLocale(locale) || !simplePageSlugs.has(slug))
    return null

  const file = resolve(pagesRoot, locale, `${slug}.md`)
  try {
    const raw = await readFile(file, 'utf-8')
    const parsed = matter(raw)
    const frontmatter = parsed.data as MarkdownPageFrontmatter

    if (!frontmatter.title)
      return null
    if (hasUnsupportedEmbeds(parsed.content))
      return null

    return {
      slug,
      locale,
      title: frontmatter.title,
      display: frontmatter.display,
      subtitle: frontmatter.subtitle,
      description: frontmatter.description,
      className: frontmatter.class,
      html: renderMarkdown(parsed.content),
      raw: parsed.content,
    }
  }
  catch {
    return null
  }
}

function isPostVisible(frontmatter: PostFrontmatter): boolean {
  if (!frontmatter.date)
    return false
  const types = (frontmatter.type || '').split('+').filter(Boolean)
  if (types.length === 1 && types[0] === 'draft')
    return false
  return true
}

function hasType(typeValue: string | undefined, type: 'blog' | 'note'): boolean {
  const types = (typeValue || 'blog').split('+').filter(Boolean)
  return types.includes(type)
}

function renderMarkdown(content: string): string {
  return markdown.render(
    content.replace(/^\[\[toc\]\]\s*$/gim, '').trim(),
  )
}

function hasUnsupportedEmbeds(content: string): boolean {
  return /<\s*[A-Z][\w-]*/.test(content)
}

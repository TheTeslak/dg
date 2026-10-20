import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import matter from 'gray-matter'
import { isSupportedLocale, supportedLocales } from '../src/locales/config.ts'
import { contentSourceDirectory } from './constants.ts'

const currentDir = dirname(fileURLToPath(import.meta.url))
const pagesDir = resolve(currentDir, '../pages')

export interface ArticleLinkGraph {
  incomingLinks: Map<string, string[]>
  outgoingLinks: Map<string, string[]>
}

function extractLinksFromMarkdown(content: string): string[] {
  const links: string[] = []

  // Match Markdown links: [text](url) or [text](<url>) or with title [text](url "title")
  // Ignore image links ![alt](url)
  const mdLinkRE = /(?<!!)\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g
  for (const match of content.matchAll(mdLinkRE)) {
    if (match[1])
      links.push(match[1])
  }

  // Match HTML <a> links: <a ... href="url" ...>
  const htmlLinkRE = /<a\s[^>]*?href=["']([^"']+)["']/gi
  for (const match of content.matchAll(htmlLinkRE)) {
    if (match[1])
      links.push(match[1])
  }

  return links
}

function resolveSlugFromLink(rawLink: string, knownSlugs: Set<string>): string | undefined {
  if (!rawLink)
    return undefined

  let link = rawLink.trim()
  if (link.startsWith('<') && link.endsWith('>'))
    link = link.slice(1, -1).trim()

  // Ignore external / protocol links
  if (/^(?:https?:|\/\/|mailto:|tel:|#)/i.test(link))
    return undefined

  // Strip query and hash
  link = link.split(/[?#]/)[0]

  // Strip leading and trailing slashes
  link = link.replace(/^\/+|\/+$/g, '')

  if (!link)
    return undefined

  const parts = link.split('/')

  // If first part is a supported locale (e.g. 'ru/article-slug'), remove it
  if (parts.length > 0 && isSupportedLocale(parts[0]))
    parts.shift()

  // If remaining is a single segment matching a known article slug
  if (parts.length === 1 && knownSlugs.has(parts[0]))
    return parts[0]

  return undefined
}

let cachedGraph: ArticleLinkGraph | null = null

export function buildArticleLinkGraph(forceRefresh = false): ArticleLinkGraph {
  if (cachedGraph && !forceRefresh)
    return cachedGraph

  const knownSlugs = new Set<string>()
  const articleFilesBySlug = new Map<string, { locale: string, path: string }[]>()

  // Step 1: Collect all known article slugs
  for (const locale of supportedLocales) {
    const dir = resolve(pagesDir, `${locale}/${contentSourceDirectory}`)
    if (!fs.existsSync(dir))
      continue

    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.md') && file !== 'index.md' && !file.startsWith('[')) {
        const slug = file.slice(0, -'.md'.length)
        knownSlugs.add(slug)
        const list = articleFilesBySlug.get(slug) || []
        list.push({ locale, path: resolve(dir, file) })
        articleFilesBySlug.set(slug, list)
      }
    }
  }

  const incomingMap = new Map<string, Set<string>>()
  const outgoingMap = new Map<string, Set<string>>()

  for (const slug of knownSlugs) {
    incomingMap.set(slug, new Set())
    outgoingMap.set(slug, new Set())
  }

  // Step 2: Scan markdown contents of all articles
  for (const [sourceSlug, files] of articleFilesBySlug) {
    for (const fileInfo of files) {
      if (!fs.existsSync(fileInfo.path))
        continue

      const raw = fs.readFileSync(fileInfo.path, 'utf-8')
      const { content } = matter(raw)
      const rawLinks = extractLinksFromMarkdown(content)

      for (const rawLink of rawLinks) {
        const targetSlug = resolveSlugFromLink(rawLink, knownSlugs)
        if (targetSlug && targetSlug !== sourceSlug) {
          outgoingMap.get(sourceSlug)?.add(targetSlug)
          incomingMap.get(targetSlug)?.add(sourceSlug)
        }
      }
    }
  }

  const incomingLinks = new Map<string, string[]>()
  const outgoingLinks = new Map<string, string[]>()

  for (const [slug, sources] of incomingMap)
    incomingLinks.set(slug, [...sources])

  for (const [slug, targets] of outgoingMap)
    outgoingLinks.set(slug, [...targets])

  cachedGraph = {
    incomingLinks,
    outgoingLinks,
  }

  return cachedGraph
}

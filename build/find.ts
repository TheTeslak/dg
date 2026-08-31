import type { SupportedLocale } from '../src/locales/config.ts'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'
import fs from 'fs-extra'
import matter from 'gray-matter'
import { supportedLocales } from '../src/locales/config.ts'
import { getFindPath } from '../src/logics/find-path.ts'
import { isPostRoutable } from '../src/logics/post-visibility.ts'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(currentDir, '..')

export const findSourceLocale = 'en' as const satisfies SupportedLocale
export const findSourceDirectory = '(finds)'

export function getFindInfo(id: string) {
  const match = id.match(/pages[\\/]en[\\/]\(finds\)[\\/](?<slug>[^/\\]+)\.md$/)
  if (!match?.groups)
    return

  return {
    sourceLocale: findSourceLocale,
    slug: match.groups.slug,
  }
}

export function isRealFind(id: string) {
  const find = getFindInfo(id)
  return !!find && !find.slug.startsWith('[') && find.slug !== 'index'
}

export function getFindServedLocales(): SupportedLocale[] {
  return [...supportedLocales]
}

export function getFindAliasPaths(slug: string) {
  return supportedLocales
    .filter(locale => locale !== findSourceLocale)
    .map(locale => getFindPath(locale, slug))
}

export async function getFindFiles() {
  return fg(`pages/en/${fg.escapePath(findSourceDirectory)}/*.md`, {
    cwd: repoRoot,
    absolute: true,
    onlyFiles: true,
  })
}

export function getFindFallbackPaths() {
  const directory = resolve(repoRoot, `pages/en/${findSourceDirectory}`)
  if (!fs.existsSync(directory))
    return []

  return fs.readdirSync(directory)
    .filter(file => file.endsWith('.md') && file !== 'index.md' && !file.startsWith('['))
    .filter((file) => {
      const { data } = matter(fs.readFileSync(resolve(directory, file), 'utf-8'))
      return isPostRoutable(data)
    })
    .flatMap(file => getFindAliasPaths(file.slice(0, -'.md'.length)))
}

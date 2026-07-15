import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import fg from 'fast-glob'
import matter from 'gray-matter'
import de from '../src/locales/messages/de.ts'
import en from '../src/locales/messages/en.ts'
import es from '../src/locales/messages/es.ts'
import fr from '../src/locales/messages/fr.ts'
import pt from '../src/locales/messages/pt.ts'
import ru from '../src/locales/messages/ru.ts'
import { supportedLocales } from '../src/locales/config.ts'
import { articleSchema, staticPageNameSchema, staticPageSchema } from '../src/utils/content-schema.ts'

const pageNames = staticPageNameSchema.options
const expectedPages = new Set(supportedLocales.flatMap(locale => pageNames.map(page => `${locale}/${page}`)))
const actualPages = new Set<string>()

for (const file of await fg('src/content/pages/*/*.md')) {
  const id = `${basename(dirname(file))}/${basename(file, '.md')}`
  const data = staticPageSchema.parse(matter(await readFile(file, 'utf8')).data)
  assert.equal(data.lang, id.split('/')[0], `${file}: lang must match its directory`)
  assert.equal(data.page, id.split('/')[1], `${file}: page must match its filename`)
  actualPages.add(id)
}
assert.deepEqual([...actualPages].sort(), [...expectedPages].sort(), 'static page collection must contain every locale/page pair')

for (const file of await fg('src/content/articles/*/*.md')) {
  const locale = basename(dirname(file))
  const slug = basename(file, '.md')
  const data = articleSchema.parse(matter(await readFile(file, 'utf8')).data)
  assert.equal(data.lang, locale, `${file}: lang must match its directory`)
  assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${file}: slug must be kebab-case`)
}

const dictionaries = { de, en, es, fr, pt, ru }
const referenceKeys = Object.keys(en).sort()
for (const locale of supportedLocales)
  assert.deepEqual(Object.keys(dictionaries[locale]).sort(), referenceKeys, `${locale}: message keys must match English`)

console.log(`[content] ${actualPages.size} localized pages, strict article schemas, and i18n keys passed.`)

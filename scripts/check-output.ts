import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import fg from 'fast-glob'

async function text(path: string) {
  return readFile(path, 'utf8')
}

const twoHeadingArticle = await text('dist/en/no-single-language.html')
assert.match(twoHeadingArticle, /data-mobile-toc-open/, 'mobile ToC button must render for two headings')
assert.match(twoHeadingArticle, /data-mobile-copy/, 'mobile copy button must render beside the ToC button')

const localizedTitles = {
  'dist/pt/articles.html': 'Artigos do Teslak',
  'dist/de/notes.html': 'Teslaks Notizen',
  'dist/fr/finds.html': 'Trouvailles',
}
for (const [path, title] of Object.entries(localizedTitles))
  assert.match(await text(path), new RegExp(`<title>${title}`), `${path}: localized title is missing`)

for (const path of ['dist/feed.xml', 'dist/feed-ru.xml', 'dist/feed-es.xml', 'dist/feed-pt.xml', 'dist/feed-de.xml', 'dist/feed-fr.xml']) {
  const feed = await text(path)
  assert.doesNotMatch(feed, /<TranslationStats\b/i, `${path}: raw custom component leaked into feed`)
  assert.doesNotMatch(feed, /<div class="table-of-contents"/, `${path}: site ToC leaked into feed`)
}

const photos = await text('dist/en/photos.html')
assert.match(photos, /data-photo-index=/, 'photo page must not deploy empty')

const cssPaths = await fg('dist/_astro/*.css')
assert.ok(cssPaths.length > 0, 'build emitted no CSS assets')
const builtCss = (await Promise.all(cssPaths.map(text))).join('\n')
for (const selector of [
  '.i-ri-translate-2',
  '.i-simple-icons-x',
  '.i-carbon-logo-github',
  '.i-ri-calendar-event-line',
  '.md\\:grid-cols-3',
  '.gap-\\[2px\\]',
  '.whitespace-nowrap',
]) {
  assert.ok(builtCss.includes(selector), `${selector} is missing from built CSS`)
}

console.log('[output] localized metadata, feeds, photos, UnoCSS, and mobile bottom actions passed.')

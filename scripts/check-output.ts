import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

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

console.log('[output] localized metadata, feeds, photos, and mobile bottom actions passed.')

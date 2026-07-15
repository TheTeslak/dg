import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createMarkdownProcessor } from '@astrojs/markdown-remark'
import { feedRehypePlugins, remarkPlugins, siteRehypePlugins } from '../src/utils/markdown-pipeline.ts'

const processor = await createMarkdownProcessor({
  remarkPlugins: [...remarkPlugins] as any,
  rehypePlugins: [...siteRehypePlugins] as any,
})
const feedProcessor = await createMarkdownProcessor({
  remarkPlugins: [...remarkPlugins] as any,
  rehypePlugins: [...feedRehypePlugins] as any,
})

async function render(markdown: string, locale = 'en', feed = false, collection = 'articles') {
  return (await (feed ? feedProcessor : processor).render(markdown, {
    fileURL: new URL(`file:///tmp/content/${collection}/${locale}/fixture.md`),
  })).code
}

const inline = await render('[quiet **and strong**]{.muted}')
assert.match(inline, /<span class="muted">quiet <strong>and strong<\/strong><\/span>/)

const standard = await render('![A useful description](/image.avif "A short caption")')
assert.match(standard, /<figure><img src="\/image\.avif" alt="A useful description"/)
assert.match(standard, /<figcaption>A short caption<\/figcaption>/)
assert.doesNotMatch(standard, / title=/)

const noCaption = await render('![Description only](/image.avif)')
assert.match(noCaption, /alt="Description only"/)
assert.doesNotMatch(noCaption, /<figcaption>/)

const wide = await render('![A wide description | wide](/wide.avif "Wide caption")')
assert.match(wide, /<figure class="img-wide">/)
assert.match(wide, /alt="A wide description"/)
assert.match(wide, /<figcaption>Wide caption<\/figcaption>/)

const spoiler = await render('::: spoiler Details\nHidden **content**\n:::')
assert.match(spoiler, /<details class="spoiler">/)
assert.match(spoiler, /<strong>content<\/strong>/)

const sources = await render('[Mention](https://example.com)\n\n<!-- sources -->\n- [Example](https://example.com)\n<!-- /sources -->', 'de')
assert.match(sources, /id="src-ref-1"/)
assert.match(sources, />Quellen</)
assert.match(sources, /class="source-backref"/)

const feedComponents = await render('[[toc]]\n\n# Heading\n\n<TranslationStats />', 'en', true)
assert.doesNotMatch(feedComponents, /<TranslationStats\b/i)
assert.doesNotMatch(feedComponents, /table-of-contents/)
assert.match(feedComponents, /translation-stats/)

const now = await render('<NowEntry date="2026-06-01">\n\nHallo!\n\n</NowEntry>', 'de', false, 'pages')
assert.match(now, /<section class="now-entry">/)
assert.match(now, /datetime="2026-06-01"/)

const articleRoot = resolve('src/content/articles')
for (const locale of readdirSync(articleRoot)) {
  for (const file of readdirSync(resolve(articleRoot, locale)).filter(name => name.endsWith('.md'))) {
    const content = readFileSync(resolve(articleRoot, locale, file), 'utf8')
    assert.equal(content.includes('|no-caption'), false, `${locale}/${file} still uses the removed no-caption modifier`)
  }
}

console.log('[markdown] custom syntax fixtures passed.')

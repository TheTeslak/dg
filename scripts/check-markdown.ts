import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createMarkdownProcessor } from '@astrojs/markdown-remark'
import rehypeRaw from 'rehype-raw'
import rehypeImageFigures from '../src/utils/rehype-image-figures.ts'
import remarkInlineAttrs from '../src/utils/remark-inline-attrs.ts'
import remarkSources from '../src/utils/remark-sources.ts'
import remarkSpoiler from '../src/utils/remark-spoiler.ts'

const processor = await createMarkdownProcessor({
  remarkPlugins: [remarkSpoiler, remarkInlineAttrs, remarkSources],
  rehypePlugins: [rehypeRaw, rehypeImageFigures],
})

async function render(markdown: string, locale = 'en') {
  return (await processor.render(markdown, {
    fileURL: new URL(`file:///tmp/content/articles/${locale}/fixture.md`),
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

const articleRoot = resolve('src/content/articles')
for (const locale of readdirSync(articleRoot)) {
  for (const file of readdirSync(resolve(articleRoot, locale)).filter(name => name.endsWith('.md'))) {
    const content = readFileSync(resolve(articleRoot, locale, file), 'utf8')
    assert.equal(content.includes('|no-caption'), false, `${locale}/${file} still uses the removed no-caption modifier`)
  }
}

console.log('[markdown] custom syntax fixtures passed.')

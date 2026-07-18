import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createMarkdownProcessor } from '@astrojs/markdown-remark'
import matter from 'gray-matter'
import { feedRehypePlugins, markdownProcessorOptions, remarkPlugins, siteRehypePlugins } from '../src/utils/markdown-pipeline.ts'

const processor = await createMarkdownProcessor({
  ...markdownProcessorOptions,
  remarkPlugins: [...remarkPlugins] as any,
  rehypePlugins: [...siteRehypePlugins] as any,
})
const feedProcessor = await createMarkdownProcessor({
  ...markdownProcessorOptions,
  remarkPlugins: [...remarkPlugins] as any,
  rehypePlugins: [...feedRehypePlugins] as any,
})

async function render(markdown: string, locale = 'en', feed = false, collection = 'articles', fileURL?: URL, frontmatter: Record<string, unknown> = {}) {
  return (await (feed ? feedProcessor : processor).render(markdown, {
    fileURL: fileURL ?? new URL(`file:///tmp/content/${collection}/${locale}/fixture.md`),
    frontmatter,
  })).code
}

async function rejectsSilently(promise: Promise<unknown>, pattern: RegExp) {
  const originalError = console.error
  console.error = () => {}
  try {
    await assert.rejects(promise, pattern)
  }
  finally {
    console.error = originalError
  }
}

const inline = await render('[quiet **and strong**]{.muted}')
assert.match(inline, /<span class="muted">quiet <strong>and strong<\/strong><\/span>/)

const nestedInline = await render('[a [b] c]{.muted}')
assert.match(nestedInline, /<span class="muted">a \[b\] c<\/span>/)

const singleQuoted = await render("[x]{term='T' definition='D'}")
assert.match(singleQuoted, /data-term="T" data-definition="D"/)

const escapedDefinition = await render(String.raw`[x]{term="T" definition="a \"quote\" b"}`)
assert.match(escapedDefinition, /data-definition="a &#x22;quote&#x22; b"/)

const bracedDefinition = await render('[x]{term="T" definition="Use {x}"}')
assert.match(bracedDefinition, /data-definition="Use \{x\}"/)

const richDefinition = await render(`[Vite]{term="Vite" definition="A <a href='/en/x'>link</a> and <mark>fast</mark>."}`)
assert.match(richDefinition, /data-definition="A <a href=&#x27;\/en\/x&#x27;>link<\/a> and <mark>fast<\/mark>\."/)

const marked = await render('==a = **b**==')
assert.match(marked, /<mark>a = <strong>b<\/strong><\/mark>/)

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
await rejectsSilently(render('::: spoiler Never closed\ncontent'), /unclosed spoiler block/)
await rejectsSilently(render('[x]{term="T" definition="unterminated}'), /malformed inline attribute/)
await rejectsSilently(render('[quiet **and strong**]{.mute}'), /malformed inline attribute/)

const sources = await render('[Mention](https://example.com)\n\n<!-- sources -->\n- [Example](https://example.com)\n<!-- /sources -->', 'de')
assert.match(sources, /id="src-ref-1"/)
assert.match(sources, />Quellen</)
assert.match(sources, /class="source-backref"/)

const rawSources = await render('<a href="https://example.com">Mention</a>\n\n<!-- sources -->\n- [Example](https://example.com)\n<!-- /sources -->')
assert.match(rawSources, /<a href="https:\/\/example\.com" id="src-ref-1"/)
assert.doesNotMatch(rawSources, /source-backref-orphan/)

const noSources = await render('[Mention](https://example.com)')
assert.doesNotMatch(noSources, /src-ref-/)
await rejectsSilently(render('[Mention](https://example.com)', 'en', false, 'articles', undefined, { sources: true }), /frontmatter enables sources/)
await rejectsSilently(render('<!-- sources -->\n- [Unused](https://example.com)\n<!-- \/sources -->'), /is not referenced in the article body/)

const feedComponents = await render('[[toc]]\n\n# Heading\n\n<TranslationStats />', 'en', true)
assert.doesNotMatch(feedComponents, /<TranslationStats\b/i)
assert.doesNotMatch(feedComponents, /table-of-contents/)
assert.match(feedComponents, /translation-stats/)

const now = await render('<NowEntry date="2026-06-01">\n\nHallo!\n\n</NowEntry>', 'de', false, 'pages')
assert.match(now, /<section class="now-entry">/)
assert.match(now, /datetime="2026-06-01"/)

const complexToc = await render('[[toc]]\n\n# Results ==fast== and [quiet]{.muted}')
assert.match(complexToc, /href="#results-fast-and-quiet">Results fast and quiet<\/a>/)
assert.match(complexToc, /<h1 id="results-fast-and-quiet">/)
assert.match(complexToc, /class="header-anchor" href="#results-fast-and-quiet"/)

const dimensioned = await render('![Alt](/images/multilang.avif)')
assert.match(dimensioned, /width="1800" height="1020"/)

const articleRoot = resolve('src/content/articles')
for (const locale of readdirSync(articleRoot)) {
  for (const file of readdirSync(resolve(articleRoot, locale)).filter(name => name.endsWith('.md'))) {
    const path = resolve(articleRoot, locale, file)
    const raw = readFileSync(path, 'utf8')
    const parsed = matter(raw)
    assert.equal(raw.includes('|no-caption'), false, `${locale}/${file} still uses the removed no-caption modifier`)
    if (parsed.data.sources)
      assert.match(parsed.content, /<!--\s*sources\s*-->/, `${locale}/${file}: sources: true requires a sources block`)
    const output = await render(parsed.content, locale, false, 'articles', new URL(`file://${path}`), parsed.data)
    assert.doesNotMatch(output, /source-backref-orphan/, `${locale}/${file}: a source is not referenced in the article body`)
  }
}

console.log('[markdown] custom syntax fixtures passed.')

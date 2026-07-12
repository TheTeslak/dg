import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { APIRoute } from 'astro'
import { Resvg } from '@resvg/resvg-js'
import { supportedLocales } from '~/locales/config'
import { getArticlesData, type PostSummary } from '~/utils/posts'

/**
 * Per-article OG images rendered from the original dg SVG template: the
 * shared `/og.png` art as background with the article title in Inter on top.
 * Everything is local — the fonts are committed under src/assets/fonts and
 * the background comes from public/og.png, so builds never depend on a CDN.
 * Any render error fails the build instead of caching a broken image.
 */

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function getStaticPaths() {
  const { all } = await getArticlesData()

  // One card per slug; the title comes from the earliest locale in site
  // order (en first) so shared images stay deterministic.
  const bySlug = new Map<string, PostSummary>()
  for (const locale of supportedLocales) {
    for (const post of all) {
      if (post.locale !== locale)
        continue
      if (!bySlug.has(post.slug) && post.title)
        bySlug.set(post.slug, post)
    }
  }

  return [...bySlug.entries()].map(([slug, post]) => ({
    params: { slug },
    props: { title: post.title },
  }))
}

const fontsDir = resolve('src/assets/fonts')
const fontFiles = [
  'inter-latin-700.woff',
  'inter-cyrillic-700.woff',
  'inter-latin-400.woff',
  'inter-cyrillic-400.woff',
].map(file => resolve(fontsDir, file))

const background = `data:image/png;base64,${readFileSync(resolve('public/og.png')).toString('base64')}`

/** Word-wraps the title into up to three ~30-char lines (dg generateOg). */
function wrapTitle(title: string): string[] {
  const lines: string[] = []
  for (const word of title.trim().split(/\s+/)) {
    const current = lines.at(-1)
    if (!current || current.length + word.length + 1 > 30)
      lines.push(word)
    else
      lines[lines.length - 1] = `${current} ${word}`
  }
  return lines.slice(0, 3)
}

export const GET: APIRoute = async ({ props }) => {
  const title = String((props as { title: string }).title || 'Teslak')
  const lines = wrapTitle(title)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <image href="${background}" width="1200" height="630" />
  <text
    fill="#fff"
    font-family="Inter"
    font-size="54"
    font-weight="400"
    letter-spacing="0"
  >
    <tspan x="210" y="270">${escapeSvgText(lines[0] || '')}</tspan>
    <tspan x="210" y="345">${escapeSvgText(lines[1] || '')}</tspan>
    <tspan x="210" y="420">${escapeSvgText(lines[2] || '')}</tspan>
  </text>
</svg>`

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      fontFiles,
      defaultFontFamily: 'Inter',
      loadSystemFonts: false,
    },
  }).render().asPng()

  return new Response(png as unknown as BodyInit, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}

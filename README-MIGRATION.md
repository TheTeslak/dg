# dg → dg-astro migration

This tree is the Astro rewrite of the original `dg` blog. `dg` remains the
semantic source of truth. The current evidence-based audit, completed fixes,
remaining gaps, and priorities are tracked in `MIGRATION-REVIEW.md`.

## What was fixed (review item → resolution)

1. **Content layer** — all articles migrated into `src/content/articles/{locale}/`.
   Missing translations were written: `colophon` and `robophobia` now exist in
   en/ru/es/pt/de/fr, `no-single-language` gained de/fr. Build scripts refuse
   to produce empty feeds / search index / sitemap (`process.exit(1)`).
2. **Fabricated content removed** — `src/data/projects.ts` is an empty array
   with the original template comment (the page shows the localized
   "{ projects are brewing }" placeholder); the Now page renders the single
   real entry from `dg/pages/*/now.md`.
3. **URL scheme restored** — articles live at `/{locale}/{slug}`
   (`src/pages/[locale]/[slug].astro`), the listing stays at
   `/{locale}/articles`. A reserved-slug collision fails the build.
4. **Markdown pipeline** — plain `.md` renders everything the Vue pipeline did:
   - `remark-breaks` (markdown-it `breaks: true` parity);
   - `::: spoiler` blocks, `[x]{.muted}`, `[x]{term= definition=}` glossary
     (remark plugins ported from `dg/build/markdown-plugins.ts`);
   - custom components (`<TranslationStats/>`, `<YouTubeEmbed/>`, `<Tweet>`,
     `<TextCopy/>`, `<MediaCard>`, `<GitHubLink/>`, `<CalCom/>`,
     `<PostNoticeBanner/>`, `<ArticleLinks/>`) render statically via
     `rehype-raw` + `src/utils/rehype-components.ts`; interactivity lives in
     `src/scripts/mdx-interactions.ts`, styles in
     `src/styles/mdx-components.css`;
   - self-closing component tags are normalized before HTML parsing
     (`remark-component-close`).
5. **Slugs/anchors** — `src/utils/slugify.ts` is the dg implementation
   verbatim; heading ids and TOC links share one uniquifier
   (`src/utils/heading-ids.ts`), so legacy `#fragment` links keep working.
6. **Data layer** — `src/utils/posts.ts` normalizes everything once (reading
   time, auto-excerpt, `/og/{slug}.png` fallback, hashtags→tags) with a
   module-level cache; the dead remark frontmatter plugin is gone.
7. **SEO** — `Default.astro` ports `useSEO`: hreflang + x-default, robots
   rules (drafts noindex, fallback aliases `noindex,follow` with canonical to
   the source locale), JSON-LD (WebSite/Person/BlogPosting/ProfilePage),
   og:type article, article:published_time/modified_time/tags, localized
   `og:locale`, absolute images, localized site names in titles.
   `scripts/generate-seo.ts` writes the sitemap (alias-free hreflang groups,
   lastmod) and robots.txt (AI-crawler policy) — the generic sitemap
   integration is not used.
8. **Visibility/fallback semantics** — `src/utils/article-locales.ts` ports
   `dg/build/article.ts`: hidden drafts never spread to other locales,
   ambiguous fallbacks throw at build time, English is the shared fallback.
9. **Locale negotiation** — the Netlify edge function, `negotiation.ts` and
   the `site-locale` cookie (with one-way legacy-localStorage migration) are
   ported; the static root page is only a no-edge/no-JS fallback and is
   `noindex`. `netlify.toml` restores security/caching headers.
10. **Feeds** — `scripts/rss.ts` renders full HTML content (markdown-it with
    the same custom syntax pre-transforms), absolute URLs, audio enclosures,
    JSON Feed 1.1 with authors/tags/attachments — for all six locales.
11. **Search** — the index stores `servedLocales`; results rewrite URLs into
    the current site locale and rank by locale tiers + whole-word boost
    (ported `getLocaleRank`/`boostDocument`). The "Only {LANG}" toggle now
    actually filters the static lists (event + localStorage, consumed by
    `ListPosts.astro`).
12. **Keyboard nav** — `preventDefault` only fires when a shortcut applies;
    ←/→ use `navigate()` (view transitions) instead of full reloads.
13. **Fonts/OG** — UnoCSS web fonts are self-hosted at build time
    (`createLocalFontProcessor`, no runtime CDN). OG images are rendered from
    the original dg SVG template (background `public/og.png` + Inter) with
    fonts committed under `src/assets/fonts` — no network at build, render
    errors fail the build.
14. **i18n system** — one `localeConfig` (6 locales: en/ru/es/pt/de/fr) drives
    everything; message dictionaries ported from the Fluent files including
    plural rules (`days-left`) and select variants (`page-not-translated`).
15. **Restored pages/features** — `/{locale}/finds` (with real data), a real
    `404.astro`, home/now pages built from the dg markdown content, the CMS
    admin config, all `_redirects` entries incl. de/fr/pt feeds.

## Photos

The ~100 MB photo library is intentionally not committed. Copy it with:

```sh
PHOTOS_SOURCE=/path/to/dg/photos pnpm photos:sync
```

`PhotoGrid`/`PhotoShowcase` pick the files up from `src/assets/photos`
automatically (a build warning reminds you when the folder is empty).

## v3 additions (component-fidelity pass)

- **Glossary** — full port of dg's GlossaryTerm.vue + WrapperPost provider as
  a vanilla runtime (`src/scripts/glossary.ts`): hover preview with leave
  delay, click-to-pin with pin fly-away animation, viewport-clamped margin
  note mirroring the ToC column (ResizeObserver), mobile bottom sheet with
  scroll lock. `[x]{.muted}` / `[x]{term= definition=}` now keep inline
  markdown across node boundaries (remark-inline-attrs).
- **Spoilers** — compact single-paragraph syntax supported; open/close via
  the same WAAPI height animation as dg.
- **Draft banner** — centered handwritten (Caveat) label like dg;
  not-translated banner is the blue left-border card with i-carbon-translate.
- **Backlinks / referenced-by** — dg markup with icons, lang tags and dates
  (`src/styles/post.css` holds the verbatim WrapperPost styles, including the
  title glint animation and 1.2em inline avatar).
- **TableOfContents** — rewritten as server-rendered Astro markup with a small
  native TypeScript controller (progress, edge reveal, mobile action bar + sheet).
- **LanguageSelector** — dg design: code+chevron trigger, animated dropdown
  with sliding hover highlight, native names + codes, methodology link.
- **GitHub alerts** — full markdown-it-github-alerts stylesheets imported.
- **Toolchain** — Astro 7 (`@astrojs/markdown-remark` for the remark/rehype
  pipeline), pnpm (`packageManager` pinned, lockfile committed).

## Commands

```sh
pnpm install
pnpm build        # search index → astro → feeds → sitemap/robots → redirects
pnpm dev
```

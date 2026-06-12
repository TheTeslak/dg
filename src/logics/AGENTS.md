# AGENTS.md (src/logics)

## Scope

Guidance for locale and routing-related logic in `src/logics/` and consumers.

## Core Concepts

- **Site locale**: UI language derived from the URL prefix.
- **Article content locale**: language of the article content itself (from source file/frontmatter).
- These are intentionally independent: UI can stay in one locale while content falls back to another.
- Matching Markdown filenames across locale folders identify translations of one article.
- Public locale keys may be shorter than standards metadata: `/pt` and the `pt` cookie map to Brazilian `pt-BR`, `pt_BR`, and `pt-br` where each format requires it.

## Source of Truth

- Locale configuration lives in `src/locales/config.ts`:
  - ordered locale registry
  - default locale and UI-message fallback order
  - English as the independent primary article fallback
  - Open Graph and feed metadata
- Locale preference negotiation lives in `src/locales/negotiation.ts`:
  - explicit `site-locale` cookie first
  - `Accept-Language` only for a neutral first visit
  - default locale when no supported preference remains
- Netlify Edge negotiates only `/` and `/index.html`; explicit locale URLs never redirect.
- `/` is a redirect-only neutral entry point. Keep it as homepage `x-default`, but do not list it as a sitemap `<loc>`.
- Netlify must serve `dist/404.html` for unknown URLs. Do not restore a catch-all SPA rewrite, because it creates soft 404 responses.
- The cookie is authoritative because Edge cannot read localStorage. The old localStorage key is migration-only.
- Locale path helpers live in [i18n-path.ts](/home/teslak/Sites/dg/src/logics/i18n-path.ts):
  - `supportedLocales`
  - `getLocaleFromPath(path)`
  - `setPathLocale(path, locale)`
  - `isSupportedLocale(locale)`
- Reuse these helpers. Do not duplicate locale regex parsing in components.
- Article URL helpers live in [article-path.ts](/home/teslak/Sites/dg/src/logics/article-path.ts):
  - article files stay in `pages/<locale>/articles/<slug>.md`
  - public article routes are `/<locale>/<slug>`
  - article indexes stay at `/<locale>/articles`

## How Article Fallback Works

- Fallback aliases are generated in [vite.config.ts](/home/teslak/Sites/dg/vite.config.ts) `extendRoute()`.
- Article slugs are the Markdown filenames without `.md`. Titles do not generate routes.
- Article frontmatter `lang` must exactly match its physical locale folder; `pnpm check:i18n` enforces this to prevent incorrect metadata and fallback decisions.
- For each article file `pages/<sourceLocale>/articles/<slug>.md`:
  - the generated route path is overridden to `/<sourceLocale>/<slug>`
  - route meta gets `frontmatter.originalLocale = sourceLocale`
  - for each other locale without `pages/<targetLocale>/articles/<slug>.md`, English is preferred; otherwise the only available routable locale is used
  - multiple non-English fallback candidates without English are a build error
  - only that source receives the alias route:
    - `/<targetLocale>/<slug>` -> source article
- This is route aliasing, not HTTP redirect.
- `note+draft` remains routable through aliases but is excluded from RSS, sitemap, and `hreflang`.
- `type: draft` and `draft: true` keep their physical preview URL but do not receive cross-locale aliases.
- A physical hidden draft intentionally occupies its locale route, so another translation must not alias over that preview URL.

## Behavior When Translation Is Added

- If `pages/<targetLocale>/articles/<slug>.md` is created later:
  - on next route generation (build, and usually dev-server restart), alias for that target locale is not added
  - the localized file becomes the route source for `/<targetLocale>/<slug>`

## Consumer Expectations

- Language switchers and locale links must preserve `query` and `hash`.
- `PostNoticeBanner` should link to `originalLocale` path (while preserving `query`/`hash`).
- Lists/navigation that are locale-aware should filter by URL locale prefix and rely on route metadata.
- Search keeps the current site locale only when that route serves the exact matched physical article version. Otherwise it links to the matched source locale so a different translation is never substituted silently.

## If Adding a New Locale

Update all relevant sources together:

1. Add locale metadata to `src/locales/config.ts`.
2. Add `src/locales/<locale>.ftl`.
3. Add the required locale content tree under `pages/<locale>/`.
4. Add the Day.js locale import in [main.ts](/home/teslak/Sites/dg/src/main.ts) while date formatting still uses Day.js.
5. Run `pnpm check:i18n`.

# AGENTS.md (src/logics)

## Scope

Guidance for locale and routing-related logic in `src/logics/` and consumers.

## Core Concepts

- **Site locale**: UI language derived from URL prefix (`/en`, `/ru`, `/es`).
- **Article content locale**: language of the article content itself (from source file/frontmatter).
- These are intentionally independent: UI can stay in one locale while content falls back to another.

## Source of Truth

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
- For each article file `pages/<sourceLocale>/articles/<slug>.md`:
  - the generated route path is overridden to `/<sourceLocale>/<slug>`
  - route meta gets `frontmatter.originalLocale = sourceLocale`
  - for each other locale without `pages/<targetLocale>/articles/<slug>.md`, an alias route is added:
    - `/<targetLocale>/<slug>` -> source article
- This is route aliasing, not HTTP redirect.

## Behavior When Translation Is Added

- If `pages/<targetLocale>/articles/<slug>.md` is created later:
  - on next route generation (build, and usually dev-server restart), alias for that target locale is not added
  - the localized file becomes the route source for `/<targetLocale>/<slug>`

## Consumer Expectations

- Language switchers and locale links must preserve `query` and `hash`.
- `PostNoticeBanner` should link to `originalLocale` path (while preserving `query`/`hash`).
- Lists/navigation that are locale-aware should filter by URL locale prefix and rely on route metadata.

## If Adding a New Locale

Update all relevant sources together:

1. `supportedLocales` in [i18n-path.ts](/home/teslak/Sites/dg/src/logics/i18n-path.ts)
2. locale list used in route alias generation in [vite.config.ts](/home/teslak/Sites/dg/vite.config.ts)
3. translation bundles and locale resources in `src/locales/` and [main.ts](/home/teslak/Sites/dg/src/main.ts)
4. locale content tree under `pages/<locale>/`

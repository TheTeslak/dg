# AGENTS.md

## Project

- Vue 3, Vite SSG, file-based `vue-router/vite` routes, Markdown/Vue pages, UnoCSS, and strict TypeScript.
- Netlify publishes `dist/`. Unknown URLs must use the generated `404.html`; do not add a catch-all SPA rewrite.
- Use `pnpm` for scripts, installs, and lockfile changes.

## Working Rules

- Keep changes focused and consistent with nearby code.
- Reuse existing utilities and components before adding abstractions or dependencies.
- Preserve SSR/SSG compatibility; guard browser-only APIs.
- Use `src/logics/i18n-path.ts` for locale paths instead of duplicating locale parsing.
- Locale-aware navigation must preserve `query` and `hash`.
- Before changing locale, routing, article fallback, or multilingual SEO behavior, read the architecture comment in `src/locales/config.ts`.
- Rules specific to route content live in `pages/AGENTS.md`.

## Validation

- Run the narrowest relevant checks first.
- Use `pnpm lint` and `pnpm typecheck` for application changes.
- Use `pnpm check:i18n` for locale, route, or translated-content changes.
- Treat frontmatter warnings as content-quality issues to resolve.

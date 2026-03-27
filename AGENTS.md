# AGENTS.md

## Purpose

Guidelines for coding agents in this repository. Keep changes minimal, safe, and consistent with the existing architecture.

## Tech Stack

- Vue 3 + Vite + Vite SSG
- File-based routing via `unplugin-vue-router` (`pages/`)
- Markdown pages rendered as Vue (`.md` + `.vue`)
- UnoCSS styling
- TypeScript strict mode
- ESLint via `@antfu/eslint-config`
- Netlify deployment (`dist/` folder, SPA fallback redirects)

## Package Manager

- Use `pnpm` for installs, scripts, and lockfile updates.

## Key Directories

- `src/` - App code (components, styles, logic, locales)
- `pages/` - Route content (`en`, `ru`, `es`), including articles
- `public/` - Static assets (images, icons, OG, admin)
- `scripts/` - Build and content tooling (RSS, redirects, image processing)
- `data/`, `photos/`, `demo/` - Structured content and media sources

## Content and Routing Rules

- Routes auto-generate from `pages/`.
- Locales: `en`, `ru`, `es`.
- Articles belong in `pages/<locale>/articles/*.md`.
- Frontmatter defines metadata (`title`, `date`, `lang`).
- Use `tags` (string array without `#`), not `hashtags`.
- `duration` defines reading time in minutes. If omitted, it's auto-estimated.
- Place shared custom OG images at `public/og/articles/<slug>.<ext>` (`avif`, `webp`, `png`, `jpg`, `jpeg`).
- Frontmatter `image` overrides the auto-generated OG image.
- Treat build warnings regarding frontmatter as content quality checks.
- Maintain parity across locales when editing content.
- Use `src/logics/i18n-path.ts` helpers for locale paths instead of custom regex.
- Navigation must preserve `query` and `hash`.
- Fallback aliases are in `vite.config.ts`. New localized files replace fallback aliases.

## Development Workflow

1. Read related files to preserve existing patterns.
2. Make focused changes; avoid broad refactors unless requested.
3. Re-use existing utilities/components instead of creating duplicates.
4. Align imports, naming, and style with surrounding code.
5. Validate frontmatter and links when modifying content.

## Do

- Keep changes small and reversible.
- Explain non-obvious design choices.
- Write clear messages.
- Preserve SSR/SSG compatibility; avoid client-only assumptions outside guarded blocks.

## Don't

- Rename or move large content trees unless requested.
- Introduce new dependencies if existing ones suffice.
- Change tooling conventions (package manager, linting, routing).

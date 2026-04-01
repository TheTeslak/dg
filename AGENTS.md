# AGENTS.md

## Purpose

Guidelines for coding agents in this repository. Keep changes minimal, safe, and consistent with the existing architecture.

## Active Migration Scope

- The active task is a full rewrite from the current Vue 3 + Vite SSG implementation to the latest Qwik 2 beta.
- Treat the existing Vue app as a behavioral and visual reference, not as an architecture to preserve.
- The migration does not need a compatibility layer between Vue and Qwik.
- Preserve public, user-visible behavior and appearance for the pages and flows that are currently in scope.
- Work continuously toward a full-site rewrite until the entire in-scope site is migrated.
- If a part of the site is currently too risky, too expensive, or not practical to port safely in the current pass, it may be skipped only if it is recorded in `TECHDEBT.md` with enough detail to resume later.

### Rewrite Quality Bar

- Prefer current framework best practices over source-level parity with the Vue implementation.
- Improve baseline accessibility during the rewrite. Focus on practical a11y that benefits the default experience: semantics, heading structure, labels, focus behavior, keyboard access, and non-decorative alt text where relevant.
- Do not build a separate accessibility-only mode. The goal is to remove avoidable accessibility regressions and obvious gaps in the default UI.
- Apply moderate SEO hygiene during the rewrite: correct document titles, descriptions, canonical URLs, crawlable internal links, and reasonable metadata parity with the existing site.
- When the original implementation has clear accessibility or semantic issues, preserve the look and user-facing behavior where possible, but prefer the more robust accessible implementation.

### Explicitly Out of Scope for the Rewrite

- Do not treat `temp/sponsors.json`, `scripts/sponsors-circles.ts`, or generated `src/data/sponsors-circles.json` as required parity blockers.
- Do not rewrite hidden sections that are not currently exposed in the navbar.
- Do not rewrite hidden tabs or hidden sections in the articles area that are not currently exposed to users.
- If a feature is hidden in the current site and the user has not explicitly asked to bring it forward, omit it from the Qwik rewrite.

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
6. Record dangerous migrations, temporary workarounds, and intentionally deferred items in `TECHDEBT.md`.
7. At the very end of the rewrite, replace or update the root `README.md` with a short two-paragraph structure and a short local run instruction.

## Do

- Keep changes small and reversible.
- Explain non-obvious design choices.
- Write clear messages.
- Preserve SSR/SSG compatibility; avoid client-only assumptions outside guarded blocks.

## Don't

- Rename or move large content trees unless requested.
- Introduce new dependencies if existing ones suffice.
- Change tooling conventions (package manager, linting, routing).

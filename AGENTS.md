# AGENTS.md

## Purpose

Guidelines for coding agents working in this repository. Keep changes minimal, safe, and consistent with the current architecture.

## Tech Stack

- Vue 3 + Vite + Vite SSG
- File-based routing via `unplugin-vue-router` (`pages/`)
- Markdown pages rendered as Vue (`.md` + `.vue`)
- UnoCSS for styling
- TypeScript (strict mode)
- ESLint via `@antfu/eslint-config`
- Netlify deployment (`dist/`, SPA fallback redirects)

## Package Manager

- This project uses `pnpm`.
- Use `pnpm` for install, scripts, and lockfile updates.

## Key Directories

- `src/` - app code (components, styles, logic, locales)
- `pages/` - route content (`en`, `ru`, `es`), including articles
- `public/` - static assets (images, icons, OG, admin)
- `scripts/` - build/content tooling (RSS, redirects, images, photos)
- `data/`, `photos/`, `demo/` - structured content/media sources

## Content and Routing Rules

- Routes are generated from `pages/` (`.md` and `.vue`).
- Locales: `en`, `ru`, `es`.
- Article files live in `pages/<locale>/articles/*.md`.
- Markdown frontmatter is used for metadata (`title`, `date`, `lang`, etc.).
- If editing localized content, keep locale parity where practical.
- For locale path operations, prefer shared helpers in `src/logics/i18n-path.ts` instead of ad-hoc regex in components.
- Language switch/navigation must preserve `query` and `hash`.
- Article fallback aliases are built in `vite.config.ts`; if a new localized article file is added, route generation prefers that file and fallback alias is no longer used.

## Development Workflow

1. Read related files before editing and preserve existing patterns.
2. Make focused changes; avoid broad refactors unless requested.
3. Prefer updating existing utilities/components over introducing duplicates.
4. Keep imports, naming, and style aligned with nearby code.
5. For content changes, validate frontmatter and links.

## Do / Don't

- Do keep changes small, reversible, and explain non-obvious decisions.
- Do preserve SSR/SSG compatibility (avoid client-only assumptions outside guarded blocks).
- Don't rename/move large content trees unless requested.
- Don't introduce new dependencies when existing ones can solve the task.
- Don't switch tooling conventions (package manager, lint style, routing model).

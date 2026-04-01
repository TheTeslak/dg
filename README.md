# dg

This repository is a working fork of Anthony Fu's public site codebase, originally built as a Vue 3 + Vite SSG blog/portfolio. The original Vue app remains in this repo as the visual and behavioral reference, while the active rewrite lives in `qwik/` and targets Qwik 2 beta without preserving Vue compatibility.

Project structure is split between the original source and the rewrite: `src/`, `pages/`, `public/`, `photos/`, and `scripts/` still power the reference implementation, while `qwik/` contains the in-progress replacement app. Visible routes already migrated in Qwik are `/{lang}`, `/{lang}/notes`, `/{lang}/articles`, `/{lang}/projects`, `/{lang}/photos`, `/{lang}/media`, `/{lang}/use`, `/{lang}/bookmarks`, and `/{lang}/bar`; the main remaining gaps are search/subnav parity for notes and articles, locale-aware 404 handling, the special `collective-sponsor-onetime` utility page, and article posts that depend on Vue-only embeds or heavier interactive components. Hidden sections from the original UI such as `talks`, `podcasts`, `streams`, `demos`, and `sponsors-list` are intentionally not being carried forward right now.

Run locally with `pnpm install`, then use `pnpm dev` for the original Vue reference app or `pnpm dev:qwik` for the rewrite. For a production check of the rewrite, use `pnpm build:qwik`.

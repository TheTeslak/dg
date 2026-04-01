# Tech Debt

## Qwik Rewrite

- The Qwik rewrite currently lives in the workspace package `qwik/`. Final cutover of the root app, build, and deploy pipeline is still pending.
- Locale preference is now persisted for migrated locale routes and `/` performs a client-side redirect based on saved preference or browser language. Exact static-host parity is still incomplete because the first paint remains a fallback chooser before hydration.
- Navbar parity is still partial. The visible `notes`, `projects`, and `photos` routes now exist, but theme toggle, exact language-selector UX, scroll-to-top, copy-link actions, and other header affordances from the Vue site are still missing.
- Full markdown parity is pending. The Qwik app currently renders article markdown with a basic server-side `markdown-it` pipeline, without the Vue site's custom Shiki, Twoslash, GitHub alerts, magic links, TOC, standalone figure transform, or embedded Vue component behavior.
- Home page parity is pending. The current Qwik locale landing pages use structured server-loaded summaries instead of rendering `pages/<locale>/index.md`.
- Search, image lightbox, keyboard navigation, floating tooltips, scroll progress, and other client-side UX details remain to be ported.
- The first Qwik `photos` route ships a basic grid and layout toggle, but it does not yet match the Vue gallery behavior, blurhash placeholders, or media interactions.
- The `use`, `media`, and other still-visible locale pages referenced from the home content are not ported yet and should not be linked from migrated Qwik pages until their routes exist.
- Generative art, Pixi, Matter.js, WebGL, demos, and similar browser-heavy experiences remain to be ported and will need careful `useTask$()` / `useVisibleTask$()` boundaries.
- RSS, sitemap, redirects, OG image generation, search indexing, and deployment cutover for the Qwik app remain to be wired into the build pipeline.
- `qwik build` on the current beta line requires `ts-morph` to be resolvable from the repository root because the beta CLI imports it directly from the pnpm store path. The current workaround keeps `ts-morph` pinned in both `qwik/package.json` and the root package until the upstream beta stops requiring that.
- `temp/sponsors.json`, `scripts/sponsors-circles.ts`, and generated `src/data/sponsors-circles.json` are intentionally not treated as parity blockers for the rewrite.
- Hidden navbar entries and hidden article tabs are intentionally out of scope unless explicitly requested later.

# Tech Debt

## Qwik Rewrite

- The Qwik rewrite currently lives in the workspace package `qwik/`. Final cutover of the root app, build, and deploy pipeline is still pending.
- Locale preference is now persisted for migrated locale routes and `/` performs a client-side redirect based on saved preference or browser language. Exact static-host parity is still incomplete because the first paint remains a fallback chooser before hydration.
- Navbar parity is still partial. The visible `notes`, `projects`, and `photos` routes now exist and the shell has a theme toggle, but the exact language-selector UX, scroll-to-top, copy-link actions, and other header affordances from the Vue site are still missing.
- Markdown parity is still partial. The Qwik app now renders magic links, heading anchors, external-link attrs, GitHub alerts, standalone image figures, and a broader Uno/icon styling base for markdown HTML, but it still lacks the Vue site's Shiki/Twoslash output, TOC/scroll-progress behavior, and embedded Vue component behavior.
- Standalone markdown pages currently use a safe allowlist (`use`, `bookmarks`, `bar`) in Qwik. Pages with Vue-only embeds or richer markdown transforms still need dedicated ports before they can be exposed safely.
- Home page parity is still partial. The Qwik locale landing pages now use dedicated custom markup closer to the Vue version, but art backgrounds and some spacing/details still need refinement.
- Post/article parity is still partial. The Qwik article wrapper now supports place metadata, backlinks, referenced-by lists, comment links, and adjacent navigation, but translation notices, scroll-progress TOC, and some post-specific decorations from the Vue site are still missing.
- Notes/articles listing parity is still partial. The Qwik lists now use year-grouped rows closer to the original site, but search-panel parity and language-filter affordances are still missing.
- Search, image lightbox, keyboard navigation, floating tooltips, scroll progress, and other client-side UX details remain to be ported.
- The Qwik `photos` route now has a persisted layout toggle and blurhash placeholders, but it still does not match the Vue gallery behavior around lightbox/media interactions and deeper gallery affordances.
- The visible `use`, `bookmarks`, `bar`, and `media` routes now exist in Qwik, but they still need deeper parity work around layout behavior, richer markdown rendering, and page-specific interactions.
- Rich markdown articles that embed Vue-only components like `Tweet`, `YouTubeEmbed`, `GitHubLink`, `SponsorButtonCollective`, `QRCode*`, or custom demo components are still only partially represented in Qwik and remain one of the largest parity gaps.
- Generative art, Pixi, Matter.js, WebGL, demos, and similar browser-heavy experiences remain to be ported and will need careful `useTask$()` / `useVisibleTask$()` boundaries.
- RSS, sitemap, redirects, OG image generation, search indexing, and deployment cutover for the Qwik app remain to be wired into the build pipeline.
- `qwik build` on the current beta line requires `ts-morph` to be resolvable from the repository root because the beta CLI imports it directly from the pnpm store path. The current workaround keeps `ts-morph` pinned in both `qwik/package.json` and the root package until the upstream beta stops requiring that.
- `temp/sponsors.json`, `scripts/sponsors-circles.ts`, and generated `src/data/sponsors-circles.json` are intentionally not treated as parity blockers for the rewrite.
- Hidden navbar entries and hidden article tabs are intentionally out of scope unless explicitly requested later.

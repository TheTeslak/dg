# Fix Plan

- [x] Fix `pnpm typecheck` failure in `scripts/lint-md.ts` by narrowing parser errors before reading `loc`.
- [x] Make production builds robust in local Node versions by applying the existing `localStorage` polyfill to the build command.
- [x] Remove unused post-list media metadata UI, docs, examples, and known frontmatter support for video, radio, platform, and in-person indicators.
- [x] Keep the Telegram navigation link unchanged for now.
- [x] Refresh open search results when the active locale changes.
- [x] Add `rel="noopener noreferrer"` to reusable `target="_blank"` links.
- [x] Validate article dates in the search-index build step before calling `toISOString()`.
- [x] Add build-time `availableLocales` metadata for physical article files.
- [x] Emit `hreflang` links only for physically available article locales, while keeping alias routing unchanged.
- [x] Verify with `pnpm lint`, `pnpm typecheck`, `pnpm lint:md`, and `pnpm build`.
- [x] Remove Netlify deployment config because deployment now targets Vercel.

# AGENTS.md (pages)

## Scope

Rules for file-based route content under `pages/`.

## Articles

- Article source files live at `pages/<locale>/articles/<slug>.md`.
- Their public URL is `/<locale>/<slug>`, without `/articles`; for example, `pages/ru/articles/name.md` is served at `https://teslak.me/ru/name`.
- `/<locale>/articles` is reserved for the article index.
- Matching slugs across locale folders identify translations of the same article.
- Missing translations are supported through fallback aliases. Do not create placeholder copies only for locale parity.
- A new physical translation replaces the fallback alias on the next route generation.

## Frontmatter

- Article frontmatter must include `title`, `date`, and `lang`.
- `lang` must exactly match the physical locale folder.
- Use `tags` as an array of strings without `#`; do not add new `hashtags`.
- `duration` is reading time in minutes and may be omitted for automatic estimation.
- Use `pages/en/articles/template.md` as the detailed frontmatter and component reference.

## Images And Validation

- The default social image is `/og.png`.
- Custom article cards belong at `public/og/articles/<slug>.png`; set `image: /og/articles/<slug>.png`.
- Keep custom social cards at `1200x630`; prefer PNG.
- Validate changed links and run `pnpm check:i18n` after locale or article-route changes.

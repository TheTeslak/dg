# AGENTS.md (pages)

## Scope

Rules for file-based route content under `pages/`.

## Content Pages

- Article and note source files live at `pages/<locale>/(content)/<slug>.md`.
- `(content)` is a pathless route group: for example, `pages/ru/(content)/name.md` is served at `https://teslak.me/ru/name`.
- The article index lives at `pages/<locale>/articles.md` and is served at `/<locale>/articles`.
- Matching slugs across locale folders identify translations of the same content page.
- Missing translations are supported through fallback aliases. Do not create placeholder copies only for locale parity.
- A new physical translation replaces the fallback alias on the next route generation.

## Frontmatter

- Content-page frontmatter must include `title`, `date`, and `lang`.
- `lang` must exactly match the physical locale folder.
- Use `tags` as an array of strings without `#`; do not add new `hashtags`.
- `duration` is reading time in minutes and may be omitted for automatic estimation.
- Use `pages/en/(content)/template.md` as the detailed frontmatter and component reference.

## Images And Validation

- The default social image is `/og.png`.
- Custom page cards belong at `public/og/pages/<slug>.png`; set `image: /og/pages/<slug>.png`.
- Keep custom social cards at `1200x630`; prefer PNG.
- Validate changed links and run `pnpm check:i18n` after locale or content-route changes.

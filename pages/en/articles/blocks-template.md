---
title: Main Big Template
date: 2026-03-03T00:00:00+00:00
updated: 2026-03-13T00:00:00+00:00
lang: en
duration: 5
backlink: about-yak-shaving
telegram: https://t.me/your_post_link
mastodon: https://mastodon.social/@antfu/your_post_link
tags:
  - template
  - markdown
---

[[toc]]

This article is a practical starter template with the core Markdown blocks and Vue components used in this project. Reuse these snippets when creating new posts to keep content consistent.

## Text Basics

Standard Markdown formatting: **bold text**, _italic text_, ~~strikethrough~~, `inline code`, and [links](https://example.com).

> A blockquote.
> Useful for highlighting a key point, a quote, or an excerpt.

### Lists

**Unordered list:**

- First item
- Second item
  - Nested item

**Ordered list:**

1. Step one
2. Step two

---

## Alerts (GitHub Style)

Use alerts to draw attention to important context:

> [!NOTE]
> **Note:** Supplemental information that helps understanding.

> [!TIP]
> **Tip:** A practical suggestion or optimization.

> [!IMPORTANT]
> **Important:** Critical information readers should not skip.

> [!WARNING]
> **Warning:** Potential mistakes or non-obvious behavior.

> [!CAUTION]
> **Caution:** Critical risks or destructive actions.

## Code Blocks (Shiki)

Syntax highlighting is provided by Shiki. Diff blocks are supported:

```ts
import { ref } from 'vue'

function hello(name: string) {
  // Log to console
  console.log(`Hello, ${name}!`)
}
```

```diff
  function hello(name: string) {
-   console.log(`Hi, ${name}!`)
+   console.log(`Hello, ${name}!`)
  }
```

## Project Vue Components

In Markdown files, you can use Vue components directly from `src/components`.

### Copyable Text (`TextCopy`)

Useful for commands and snippets readers need to copy.
`<TextCopy text="pnpm install" />`

<TextCopy text="pnpm install" />

### GitHub Link (`GitHubLink`)

Specialized component for linking repositories.
`<GitHubLink repo="antfu/vueuse" name="VueUse" />`

<GitHubLink repo="antfu/vueuse" name="VueUse" />

### YouTube & Video Links

There are two ways to share YouTube content depending on your needs.

#### 1. Embedded Video (`YouTubeEmbed`)

Use the `<YouTubeEmbed>` component to embed a fully playable video without loading a heavy iframe immediately (improves page performance).

`<YouTubeEmbed id="dQw4w9WgXcQ" />`

<YouTubeEmbed id="dQw4w9WgXcQ" />

#### 2. Inline Text Link with Icon (UnoCSS)

If you just want a sleek inline link, you can embed UnoCSS icon classes (powered by Iconify). Search for any icon on [icones.js.org](https://icones.js.org/). Use the `<span />` tag with the `i-` prefix.

```html
<a href="https://youtu.be/dQw4w9WgXcQ" target="_blank">
  <span class="op75 i-simple-icons-youtube" /> Watch on YouTube
</a>
```

**Example:** <a href="https://youtu.be/dQw4w9WgXcQ" target="_blank"><span class="op75 i-simple-icons-youtube" /> Watch on YouTube</a>

### Twitter/X Embed (`Tweet`)

Use `<Tweet>` for native tweet rendering.

<Tweet>
  <p lang="en" dir="ltr">Just setting up my twttr</p>&mdash; jack (@jack) <a href="https://twitter.com/jack/status/20?ref_src=twsrc%5Etfw">March 21, 2006</a>
</Tweet>

### Photos: Carousel and Tiles (`PhotoShowcase`)

You can embed photos directly inside an article. They do not have to be limited to the `/photos` page.

Use `mode="slide"` for a horizontal carousel:
`<PhotoShowcase mode="slide" ids="p-2018-01-30-14-18-35-000-1,p-2018-01-31-08-17-06-000-1,p-2018-02-03-14-21-24-000-1" />`

<PhotoShowcase mode="slide" ids="p-2018-01-30-14-18-35-000-1,p-2018-01-31-08-17-06-000-1,p-2018-02-03-14-21-24-000-1" />

Use `mode="grid"` for tiled photos:
`<PhotoShowcase mode="grid" :limit="8" />`

<PhotoShowcase mode="grid" :limit="8" />

### Sponsor Buttons

`<SponsorButtons />`
<SponsorButtons />

### Article Links (`ArticleLinks`)

Embed clickable preview cards linking to other articles. Useful for hub/collection posts.

```
<ArticleLinks :links="['reimagine-atomic-css', 'rewrite-in-vite', 'icons-in-pure-css']" />
```

<ArticleLinks :links="['reimagine-atomic-css', 'rewrite-in-vite', 'icons-in-pure-css']" />

Pass an array of article **slugs** (filename without `.md`). The component resolves the title and excerpt automatically from each article's frontmatter.

## Discussion Links

Add `telegram` and/or `mastodon` fields to frontmatter to show discussion links at the bottom of the article:

```yaml
---
title: My Article
telegram: https://t.me/your_post_link
mastodon: https://mastodon.social/@antfu/your_post_link
---
```

They appear below the article content as "Comment on Telegram / Mastodon" links.

## Backlinks

Add an optional `backlink` field to frontmatter with the **slug** of a parent article:

```yaml
---
title: My Article
backlink: about-yak-shaving
---
```

**What it does:**

- **Top of the article** — shows a `⬑ Parent Article Title` link above the title
- **Bottom of the parent** — automatically shows a "Referenced by" section listing articles that backlink to it

The slug is locale-agnostic. If the target article isn't translated, the user sees the original content with a "not translated" banner (existing behavior).

If the backlinked article is in a different language than the current UI locale, a small language tag (e.g. `EN`) appears next to the link.

> [!NOTE]
> This article itself has `backlink: about-yak-shaving` in its frontmatter — scroll up to see the backlink header.

---

_Use this file as a quick reference when drafting new posts._

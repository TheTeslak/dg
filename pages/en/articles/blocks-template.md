---
title: Main Big Template
date: 2026-03-03T00:00:00+00:00
updated: 2026-03-13T00:00:00+00:00
lang: en
duration: 5
description: A comprehensive reference for Markdown blocks and custom Vue components used in this blog's articles.
backlink: about-yak-shaving
telegram: https://t.me/your_post_link
mastodon: https://mastodon.social/@antfu/your_post_link
tags:
  - template
  - markdown
---

[[toc]]

A quick copy-paste reference for Markdown blocks and custom Vue components.

## Text & Formatting Basics

Standard Markdown formatting is fully supported: **bold text**, _italic text_, ~~strikethrough~~, `inline code`, [links](https://example.com), and ==highlighted text==.

### Quotes

> A standard blockquote.
> Useful for highlighting a key point, a quote, or an excerpt.

**Wisper quote block (custom styled):**

> <span font-wisper font-bold op80 text-1.4rem leading-2.1rem>"But somehow, there seems to be something, <br>something makes me hard to breathe."</span>

### UnoCSS Inline Styling

You can apply UnoCSS utility classes directly to HTML tags to style text inline without writing custom CSS.

```html
<b important-text-hex-E3B65E>Velocity</b>
<b important-text-hex-D777B1>Scope</b>
<b important-text-hex-80BEDF>Quality</b>
<span op75>(faded text)</span>
```

**Result:** <b important-text-hex-E3B65E>Velocity</b>, <b important-text-hex-D777B1>Scope</b>, <b important-text-hex-80BEDF>Quality</b>, and an opacity badge <span op75>(faded text)</span>.

### Lists

**Unordered list:**

- First item
- Second item
  - Nested item

**Ordered list:**

1. Step one
2. Step two

---

## Code Blocks

Syntax highlighting is provided by Shiki. Diff blocks are supported out of the box.

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

---

## Media & Visuals

These are the most frequently used components for embedding rich media and linking your articles together.

### Photos: Carousel and Tiles (`PhotoShowcase`)

You can embed photos directly inside an article. They do not have to be limited to the `/photos` page.

**Horizontal carousel (`mode="slide"`):**
`<PhotoShowcase mode="slide" ids="p-2018-01-30-14-18-35-000-1,p-2018-01-31-08-17-06-000-1,p-2018-02-03-14-21-24-000-1" />`

<PhotoShowcase mode="slide" ids="p-2018-01-30-14-18-35-000-1,p-2018-01-31-08-17-06-000-1,p-2018-02-03-14-21-24-000-1" />

**Tiled photos (`mode="grid"`):**
`<PhotoShowcase mode="grid" :limit="8" />`

<PhotoShowcase mode="grid" :limit="8" />

### Article Links (`ArticleLinks`)

Embed clickable preview cards linking to other articles. This is especially useful for hub or collection posts.

```vue
<ArticleLinks :links="['reimagine-atomic-css', 'rewrite-in-vite', 'icons-in-pure-css']" />
```

<ArticleLinks :links="['reimagine-atomic-css', 'rewrite-in-vite', 'icons-in-pure-css']" />

_Note: Pass an array of article **slugs** (the filename without `.md`). The component resolves the title and excerpt automatically from each article's frontmatter._

### YouTube & Video Links

There are two ways to share YouTube content depending on your needs.

**1. Embedded Video (`YouTubeEmbed`)**

Use the `<YouTubeEmbed>` component to embed a fully playable video without loading a heavy iframe immediately. This significantly improves page performance.

`<YouTubeEmbed id="dQw4w9WgXcQ" />`

<YouTubeEmbed id="dQw4w9WgXcQ" />

**2. Inline Text Link with Icon (UnoCSS)**

If you just want a sleek inline link, you can embed UnoCSS icon classes (powered by Iconify). Use the `<span />` tag with the `i-` prefix. Search for any icon on [icones.js.org](https://icones.js.org/).

```html
<a href="https://youtu.be/dQw4w9WgXcQ" target="_blank">
  <span class="op75 i-simple-icons-youtube" /> Watch on YouTube
</a>
```

**Result:** <a href="https://youtu.be/dQw4w9WgXcQ" target="_blank"><span class="op75 i-simple-icons-youtube" /> Watch on YouTube</a>

---

## Meta & Navigation

### Backlinks

Add an optional `backlink` field to frontmatter with the **slug** of a parent article:

```yaml
---
title: My Article
backlink: about-yak-shaving
---
```

**What it does:**

- **Top of the article** — shows a `⬑ Parent Article Title` link above the title.
- **Bottom of the parent** — automatically shows a "Referenced by" section listing articles that backlink to it.

_Note: The slug is locale-agnostic. If the backlinked article is in a different language than the current UI locale, a small language tag (e.g. `EN`) appears next to the link. Scroll up to the top of this page to see the backlink header._

### Discussion Links

Add `telegram` and/or `mastodon` fields to frontmatter to show discussion links at the bottom of the article:

```yaml
---
title: My Article
telegram: https://t.me/your_post_link
mastodon: https://mastodon.social/@antfu/your_post_link
---
```

They appear below the article content as "Comment on Telegram / Mastodon" links.

---

## Interactive Utilities

### Copyable Text (`TextCopy`)

Useful for commands and snippets readers need to copy.

`<TextCopy text="pnpm install" />`

<TextCopy text="pnpm install" />

### GitHub Link (`GitHubLink`)

Specialized component for linking repositories.

`<GitHubLink repo="antfu/vueuse" name="VueUse" />`

<GitHubLink repo="antfu/vueuse" name="VueUse" />

### Sponsor Buttons

Shows interactive project sponsorship buttons.

`<SponsorButtons />`

<SponsorButtons />

### Spoiler / Collapsible Block (`Spoiler`)

Collapsed by default. Useful for optional details, long lists, or plot spoilers.

`<Spoiler title="Click to expand">`

<Spoiler title="Click to expand">

This content is hidden until the reader clicks the summary. You can put any Markdown here: **bold**, `code`, lists, images, etc.

</Spoiler>

---

## Secondary Features

### Alerts (GitHub Style)

Use alerts to draw attention to important context or edge cases.

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

### Twitter/X Embed (`Tweet`)

Use `<Tweet>` for native tweet rendering.

<Tweet>
  <p lang="en" dir="ltr">Just setting up my twttr</p>&mdash; jack (@jack) <a href="https://twitter.com/jack/status/20?ref_src=twsrc%5Etfw">March 21, 2006</a>
</Tweet>

---

_Use this file as a quick reference when drafting new posts._

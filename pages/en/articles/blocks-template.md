---
title: Blocks and Components Template
date: 2026-03-03T00:00:00.000+00:00
lang: en
duration: 5
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

_(Horizontal divider / `hr`)_

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

### YouTube Embed (`YouTubeEmbed`)

Embeds a video without loading a heavy player immediately.
`<YouTubeEmbed id="dQw4w9WgXcQ" />`

<YouTubeEmbed id="dQw4w9WgXcQ" />

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

---

_Use this file as a quick reference when drafting new posts._

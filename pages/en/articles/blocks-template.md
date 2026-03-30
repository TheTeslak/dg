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

---

## Meta, Configuration & Navigation

### Frontmatter Reference

Every article begins with a YAML block. The fields here drive both SEO and on-page UI elements.

```yaml
---
title: My Article
description: SEO and social preview text (max 400 chars).
date: 2026-03-24T10:00:00Z
lang: en # UI locale (en, ru, es)
duration: 8min # manual override (e.g. '8min' or '5')
backlink: parent-slug # link to parent article above title
type: note+draft # post type and status (combined with '+')
originalLocale: ru # source language for non-translated posts
---
```

#### Field Logic & Behavior

- **`type` (Status & Visibility)**: This field controls where the post appears and its status.
  - `type: draft` or `draft: true`: Fully hidden from lists and RSS. Use for private WIPs.
  - `type: note+draft` (or `blog+draft`): Visible in lists with a **🚧 indicator**, but still marked as a draft internally (`noindex`).
- **`duration` (Reading Time)**: By default, the build system auto-estimates reading time (~200 words/min). If you specify a value (e.g., `8min`), it will bypass the auto-calculation.
- **`originalLocale` (Translation)**: When an article is not yet translated, this field indicates the source language. If it differs from the current page locale, a **Translation Banner** will appear pointing users to the original version.
- **`backlink` (Hierarchy)**: Pass the slug of the "parent" article. A link will appear at the top (`⬑ Parent Title`), and this article will be listed under "Referenced by" at the bottom of the parent article.

### Article Status & Banners

Special banners that automatically or manually indicate the current state of the post.

**Draft Notice:**
Shows when `draft: true` is set.
`<PostNoticeBanner is-draft />`

<PostNoticeBanner is-draft />

**Translation Notice:**
Shows when `originalLocale` is different from the current page language.
`<PostNoticeBanner original-locale="ru" />`

<PostNoticeBanner original-locale="ru" />

---

## Text & Formatting Basics

Standard Markdown formatting is fully supported: **bold text**, _italic text_, ~~strikethrough~~, `inline code`, [links](https://example.com), and ==highlighted text==.

### Quotes

> A standard blockquote.
> Useful for highlighting a key point, a quote, or an excerpt.

**Wisper quote block (custom styled):**

> <span class="quote-wisper">"But somehow, there seems to be something, <br>
> something makes me hard to breathe."</span>

### Semantic Labels & Badges

Beyond simple bolding, you can use technical-style badges for categorization or status labels.

```html
<code important-text-lime>test</code>
<code important-text-purple>lint</code>
<code important-text-cyan>build</code>
<code important-text-orange>script</code>
<code important-text-green>frontend</code>
```

**Result:** <code important-text-lime>test</code>, <code important-text-purple>lint</code>, <code important-text-cyan>build</code>, <code important-text-orange>script</code>, and <code important-text-green>frontend</code>.

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

**Highlighting lines:**
Add `// [!code highlight]` to a line to highlight it.

```ts
function hello() {
  console.log('Hello World') // [!code highlight]
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

### Standard Images

Standard markdown images fit within the content column. When `alt` text is provided, it automatically becomes a centered caption below the image via `<figcaption>`. Images without `alt` text render without a caption wrapper.

**Without caption** (no alt text → no `<figure>` wrapper):

```markdown
![](/images/ai-qrcode-final.jpg)
```

![](/images/ai-qrcode-final.jpg)

**With caption** (alt text → auto `<figure>` + `<figcaption>`):

```markdown
![AI-generated QR code with artistic styling](/images/ai-qrcode-final.jpg)
```

![AI-generated QR code with artistic styling](/images/ai-qrcode-final.jpg)

### Wide Images (`img-wide`)

If you want a single large image that breaks out of the content container on desktop (like YouTube embeds do) but perfectly fits the screen on mobile, simply apply the `img-wide` class to your image tags.

```html
<img src="/images/ai-qrcode-final.jpg" class="img-wide" />
```

<img src="/images/ai-qrcode-final.jpg" class="img-wide" />

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

### Glossary Term (Marginal Annotation) (`GlossaryTerm`)

Adds a dashed underline to a term and displays its definition in a margin note on desktop or a bottom sheet on mobile when clicked.

**1. Simple Definition via Props**

```html
<GlossaryTerm
  term="Gradient Descent"
  definition="An iterative optimization algorithm for finding a local minimum of a differentiable function."
>
  gradient descent
</GlossaryTerm>
```

In machine learning, <GlossaryTerm term="Gradient Descent" definition="An iterative optimization algorithm for finding a local minimum of a differentiable function.">gradient descent</GlossaryTerm> is used to minimize the loss function.

**2. Rich Definition with HTML**

The `definition` prop accepts HTML, so you can include links, `<mark>`, `<code>`, etc.:

```html
<GlossaryTerm
  term="Vite"
  definition="A frontend build tool that improves the <a href='/en/articles/rewrite-in-vite'>developer experience</a> using native ES modules and <mark>lightning fast</mark> HMR."
>
  Vite
</GlossaryTerm>
```

Many modern frameworks are now powered by <GlossaryTerm term="Vite" definition="A frontend build tool that improves the <a href='/en/articles/rewrite-in-vite'>developer experience</a> using native ES modules and <mark>lightning fast</mark> HMR.">Vite</GlossaryTerm> under the hood.

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

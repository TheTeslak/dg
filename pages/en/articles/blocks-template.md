---
title: Main Big Template
date: 2026-03-03T00:00:00+00:00
updated: 2026-03-13T00:00:00+00:00
lang: en
duration: 5
description: A comprehensive reference for Markdown blocks and custom Vue components used in this blog's articles.
backlink: about-yak-shaving
telegram: https://t.me/post_link
mastodon: https://mastodon.social/@name/post_link
tags:
  - template
  - markdown
sources: true
audio: true
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
display: Custom Title for Article Page # overrides title on page
description: SEO and social preview text (max 400 chars).
subtitle: A short catchphrase below the title
image: /og/image.png # cover image & player artwork
date: 2026-03-24T10:00:00Z
updated: 2026-04-30T10:00:00Z # shows 'updated' date
lang: en # UI locale (en, ru, es)
duration: 8min # manual override (e.g. '8min' or '5')
backlink: parent-slug # link to parent article above title
type: note+draft # post type and status (combined with '+')
originalLocale: ru # source language for non-translated posts
sources: true # enables automatic sources generation
art: plum # background animation: random, plum, dots, cellular, topography, interference
tocAlwaysOn: true # keeps ToC visible on wider screens
place: Paris # location name
placeLink: https://maps.google.com/... # location link
audio: true # shortcut: auto-resolves from public/audio/articles/<locale>/<slug>.*
# or explicit:
# audio:
#   url: /audio/articles/en/my-article.m4a
#   title: "Audio Version"
#   duration: "12:45"
#   artist: "Teslak"
#   sourceTextUpdatedAt: 2026-03-24T10:00:00Z
#   downloadUrl: /audio/alt.mp3
---
```

#### Field Logic & Behavior

- **`type` (Status & Visibility)**: This field controls where the post appears and its status.
  - `type: draft` or `draft: true`: Fully hidden from lists and RSS. Use for private WIPs.
  - `type: note+draft` (or `blog+draft`): Visible in lists with a **🚧 indicator**, but still marked as a draft internally (`noindex`).
- **`display`**: Overrides the `title` on the page itself. Useful when the `title` needs to be optimized for lists/RSS but the page needs a different look.
- **`subtitle`**: Secondary title shown in italics below the main header.
- **`image`**: Primary image for the post. Used in Open Graph tags, social previews, and as the background for the audio player.
- **`art`**: Controls the background canvas animation. Values: `random`, `plum`, `dots`, `cellular`, `topography`, `interference`.
- **`tocAlwaysOn`**: When `true`, prevents the Table of Contents from being hidden behind a toggle on desktop viewports.
- **`place` / `placeLink`**: Shows a "at [Location]" badge below the date.
- **`duration` (Reading Time)**: By default, the build system auto-estimates reading time (~200 words/min). If you specify a value (e.g., `8min`), it will bypass the auto-calculation.
- **`originalLocale` (Translation)**: When an article is not yet translated, this field indicates the source language. If it differs from the current page locale, a **Translation Banner** will appear pointing users to the original version.
- **`backlink` (Hierarchy)**: Pass the slug of the "parent" article. A link will appear at the top (`⬑ Parent Title`), and this article will be listed under "Referenced by" at the bottom of the parent article.
- **`sources` (References)**: When set to `true`, enables the automatic generation of a numbered sources block at the bottom of the article (requires `<!-- sources -->` markers in the body).
- **`audio` (Voiceover)**: Configures the integrated audio player.
  - **Shortcut:** `audio: true` — auto-resolves the audio file from `public/audio/articles/<locale>/<slug>.*` (priority: m4a → opus → ogg → mp3 → wav). Duration is read from `data/audio-metadata.json` (run `pnpm run process-audio` to generate).
  - **Explicit:** `audio: { url, title?, duration?, artist?, sourceTextUpdatedAt?, downloadUrl? }`.
  - `url`: Path to the audio file (required in explicit form).
  - `title`: Display name in the player (defaults to article title).
  - `duration`: Manual duration string (e.g., "12:45"). Auto-filled from cache when omitted.
  - `artist`: Artist name for Media Session (defaults to "Teslak").
  - `sourceTextUpdatedAt`: If the article's `updated` or `date` is newer than this timestamp, a warning will appear indicating the audio might be outdated.
  - `downloadUrl`: Override for the download button link (defaults to `url`).

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

### Alternative Translations (Ruby Text)

You can use HTML `<ruby>` tags to display tiny annotations (like translations or pronunciations) above the main text. This is a standard HTML feature and works with any language, such as writing English translations over Russian words.

```html
<ruby lang="ja">東京<rp>(</rp><rt>Tokyo</rt><rp>)</rp></ruby>
<ruby lang="ru">Медведь<rp>(</rp><rt>Bear</rt><rp>)</rp></ruby>
```

**Result:** <ruby lang="ja">東京<rp>(</rp><rt>Tokyo</rt><rp>)</rp></ruby> and <ruby lang="ru">Медведь<rp>(</rp><rt>Bear</rt><rp>)</rp></ruby>.

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

### Dark Mode Inversion (`dark:filter-invert`)

For SVG diagrams or charts designed for a light background, apply `dark:filter-invert` so colors automatically invert in dark mode. This attribute is preserved in the lightbox overlay.

```html
<img src="/images/npm-esm-vs-cjs-2024.svg" dark:filter-invert />
```

<img src="/images/npm-esm-vs-cjs-2024.svg" dark:filter-invert />

### Media Card (`MediaCard`)

A reusable card for embedding an image with metadata inline in an article. Not tied to any specific content type — works for books, people, products, or anything with an image and a title. Two layout variants:

**1. Float variant (`variant="float"`)** — image floats left, text wraps around it. On mobile, it becomes a compact horizontal strip with text flowing below (no wrapping on narrow screens).

```vue
<MediaCard
  variant="float"
  image="https://covers.openlibrary.org/b/id/8739161-M.jpg"
  title="Thinking, Fast and Slow"
  subtitle="Daniel Kahneman"
>
Kahneman explains why we make systematic errors...
</MediaCard>
```

Sample:

<MediaCard variant="float" image="https://covers.openlibrary.org/b/id/8739161-M.jpg" title="Thinking, Fast and Slow" subtitle="Daniel Kahneman">

The architecture of human cognition is governed by a fundamental duality: the interplay between immediate, heuristic-driven intuition and the deliberate, resource-intensive nature of logical analysis. This tension defines how we perceive external stimuli and construct our internal models of reality. While our primary cognitive mode operates through rapid, subconscious pattern recognition—the biological equivalent of an autopilot—it is precisely this efficiency that introduces systemic biases into our decision-making frameworks. Cognitive errors are not random failures but predictable ripples in the way our brains process complex information. By examining the mechanics of this internal friction, we can move beyond mere awareness and begin to implement robust mental scaffolds that safeguard our judgment against the invisible gravity of instinctual errors.

</MediaCard>

**2. Aside variant (default)** — horizontal card with image on the left and info on the right.

```vue
<MediaCard
  image="https://covers.openlibrary.org/b/id/12818862-M.jpg"
  title="The Master and Margarita"
  subtitle="Mikhail Bulgakov · 1967"
  description="A novel about the Devil's visit to Soviet Moscow. About cowardice, honesty, and immortality. One of the most quoted and important texts of 20th-century Russian literature."
/>
```

Sample:

<MediaCard
  image="https://covers.openlibrary.org/b/id/12818862-M.jpg"
  title="The Master and Margarita"
  subtitle="Mikhail Bulgakov · 1967"
  description="A novel about the Devil's visit to Soviet Moscow. About cowardice, honesty, and immortality. One of the most quoted and important texts of 20th-century Russian literature."
/>

**Props Reference:**

| Prop          | Type                 | Description                                                                           |
| ------------- | -------------------- | ------------------------------------------------------------------------------------- |
| `variant`     | `'float' \| 'aside'` | Layout mode. Default: `aside`                                                         |
| `image`       | `string`             | Image URL (required)                                                                  |
| `title`       | `string`             | Card title (required)                                                                 |
| `subtitle`    | `string`             | Secondary line (author, date, role, etc.)                                             |
| `description` | `string`             | Description text (aside variant)                                                      |
| `ratio`       | `string`             | Force aspect ratio (e.g. `"2/3"`, `"1/1"`). Default: auto (image natural proportions) |

_The `ratio` prop is useful when images have inconsistent proportions. For example, `ratio="2/3"` for book covers or `ratio="1/1"` for avatars will crop and fit the image to that exact shape._

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

### Audio Player (`audio` frontmatter)

The audio player is automatically injected at the top of the article when the `audio` field is present in the frontmatter. It supports:

- **Sticky Mini-player:** When you scroll past the main player, a compact version sticks to the top of the viewport.
- **Playback Persistence:** Progress is saved to `localStorage`, allowing readers to resume from where they left off.
- **Media Session Integration:** Control playback via hardware keys or OS media controls (lock screen, notifications).
- **Speed Control:** Adjustable playback rates (1x, 1.25x, 1.5x, 2x).
- **Outdated Warning:** Automatically detects if the article text has been updated since the audio was recorded.
- **Multi-format Support:** File lookup priority: `.m4a` → `.opus` → `.ogg` → `.mp3` → `.wav`.

**Shortcut form** — just drop an audio file into `public/audio/articles/<locale>/<slug>.m4a` and set:

```yaml
audio: true
```

The build system resolves the URL, format, and duration automatically from `data/audio-metadata.json` (generated by `pnpm run process-audio`).

**Explicit form** — for manual control over all fields:

```yaml
audio:
  url: /audio/articles/en/my-article.m4a
  title: Audio Version # optional, defaults to article title
  duration: '12:45' # optional, auto-filled from cache
  artist: Teslak # optional, defaults to "Teslak"
  sourceTextUpdatedAt: 2026-03-24T10:00:00Z # optional, shows warning if text is newer
  downloadUrl: /audio/alt.mp3 # optional, overrides download link
```

---

## Build Commands

Scripts that process content before deployment. Run them manually when content changes, or include in CI.

### `pnpm run process-audio`

Scans all articles with `audio: true` (or an explicit `audio` object), locates the corresponding audio file in `public/audio/articles/<locale>/`, extracts its duration via `music-metadata`, and writes a cache to `data/audio-metadata.json`. The Vite build reads this cache to inject `duration` into the frontmatter without reparsing audio files on every dev restart.

```bash
pnpm run process-audio
```

Run this after adding or replacing an audio file.

### `pnpm run resolve-sources`

Scans articles with `sources: true` and `<!-- sources -->` blocks, fetches page titles for any source URLs that have placeholder titles, and updates the Markdown files in place.

```bash
pnpm run resolve-sources
```

Run this after adding new source links to an article.

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

### Sources Block

Add `sources: true` to the frontmatter and place `<!-- sources --> ... <!-- /sources -->` markers at the end of the article. Run `pnpm run resolve-sources` to automatically fetch titles and update the list.

Here's another mention of [Example Domain](https://example.com) to test duplicate handling.

And a link to [Wikipedia about REST](https://en.wikipedia.org/wiki/Representational_state_transfer) for good measure.

<!-- sources -->

- [Example Domain](https://example.com)
- [Icônes — Icon Explorer](https://icones.js.org/)
- [YouTube](https://youtu.be/dQw4w9WgXcQ)
- [REST — Wikipedia](https://en.wikipedia.org/wiki/Representational_state_transfer)
- [Orphan Link — Not In Article](https://orphan-test.example.org/page)
<!-- /sources -->

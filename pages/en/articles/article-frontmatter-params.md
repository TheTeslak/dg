---
title: Article YAML Frontmatter Parameters
date: 2026-03-15T00:00:00Z
lang: en
duration: 5min
type: note
---

A comprehensive reference of all YAML frontmatter parameters available for articles in this project.

## Core Properties

### title

**Required** - Article title (used for SEO and display)

### date

**Required** - Publication date in ISO format (e.g., `2026-03-15T00:00:00Z`)

### updated

Last updated date (optional)

### lang

Content language (e.g., `en`, `ru`, `es`)

### duration

Reading time in minutes. Supports "min" suffix (e.g., `5min` or `5`). Auto-estimated if missing.

### type

Content type. Default: `blog`. Supported types:

- `blog` - Standard article
- `note` - Short note (displayed differently)
- Custom types can be defined (e.g., `talk`, `event`)
- Multiple types can be combined with `+` (e.g., `blog+note`)

## Display & Styling

### display

Custom display title (overrides `title`)

### subtitle

Article subtitle (optional)

### art

Background art component. Options:

- `plum`
- `dots`
- `cellular`
- `topography`
- `interference`
- `random`

### tocAlwaysOn

Keep table of contents visible (boolean: `true` or `false`)

### class

Custom CSS class for article container

### wrapperClass

Custom CSS class for article wrapper

## Content & Metadata

### description

Meta description for SEO (used in social sharing and search results)

### excerpt

Manual excerpt (auto-generated from content if missing)

### tags

Array of tags (replaces deprecated `hashtags`)

### image

Custom Open Graph (OG) image URL (auto-generated if missing)

### audio

Local article audio. The player renders only when `audio.url` exists.

Recommended file location:
`/public/audio/articles/<locale>/<slug>.<mp3|m4a|ogg>`

Use the served path in frontmatter:
`/audio/articles/<locale>/<slug>.mp3`

Supported fields:

- `url` - Required local audio path
- `sourceTextUpdatedAt` - Date of the article text used for the recording
- `duration` - Optional display duration
- `title` - Optional audio title override
- `downloadUrl` - Optional separate local download path

### draft

Mark as draft (boolean: `true` or `false`)

### originalLocale

Original language (auto-set by build process)

## Links & Social

### backlink

Slug of article to backlink to (supports array of slugs)

### redirect

External URL to redirect to

### link

External link (for demo pages)

### telegram

Telegram comment link

### mastodon

Mastodon comment link

## Event/Recording Info

### place

Event location

### placeLink

Link to event location

### recording

Recording URL

### upcoming

Upcoming event (boolean)

## Projects

### projects

Related projects (array)

## Deprecated Parameters

### hashtags

Use `tags` instead (deprecated)

## File Location

Articles are stored in:
`/pages/<locale>/articles/`

Where `<locale>` is one of:

- `en` - English
- `ru` - Russian
- `es` - Spanish

## Example Usage

### Basic Article

```yaml
---
title: My Awesome Article
date: 2026-03-15T00:00:00Z
lang: en
duration: 10min
audio:
  url: /audio/articles/en/my-awesome-article.mp3
  sourceTextUpdatedAt: 2026-03-15T00:00:00Z
  duration: 12:34
---
```

### Note Type

```yaml
---
title: Quick Note
date: 2026-03-15T00:00:00Z
lang: en
duration: 2
type: note
---
```

### Event Article

```yaml
---
title: Conference Talk
date: 2026-03-15T00:00:00Z
lang: en
duration: 30
type: talk
recording: https://youtube.com/watch?v=12345
place: Online
---
```

---
title: One-off Blocks
date: 2026-04-04T00:00:00Z
lang: en
description: Reference for localized Vue components used for complex interactive demos and layouts.
type: note
---

A quick reference for specialized Vue components. These blocks solve specific complex tasks — like interactive demos or galleries — keeping the core text template clean.

## Structural & Index Components

These are primarily used on hub/index pages to list content, not inside standard articles.

### `<PhotoGalleryAll>`

Renders a large masonry grid of all photos. Used in `photos-page.md`.

```html
<PhotoGalleryAll :limit="12" class="gap-1!" />
```

<PhotoGalleryAll :limit="12" class="gap-1!" />

## One-off Interactive Demos

Custom components built for a single specific article.

### `<AsyncSyncQuantum>`

A visualization of async/sync flows used in `async-sync-in-between.md`.

```html
<AsyncSyncQuantum />
```

<AsyncSyncQuantum />

### `<ShikiMagicMoveDemo>` & `<ShikiMagicMoveMatch>`

Code transition demos built exclusively for `shiki-magic-move.md`.

```html
<ShikiMagicMoveDemo />

<ShikiMagicMoveMatch />
```

<ShikiMagicMoveDemo />

<ShikiMagicMoveMatch />

### `<SponsorButtonCollective>`

A specialized collective button variant used only in `sponsorship-forwarding.md`.

```html
<SponsorButtonCollective />
```

<SponsorButtonCollective />

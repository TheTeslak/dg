---
title: "Backlinks Demo: First Child"
date: 2026-03-05T00:00:00.000+00:00
lang: en
duration: 1
type: note
backlink: backlinks-demo-root
tags:
  - demo
  - backlinks
---

This article **backlinks** to the root article. You should see:

1. **At the top** — a `⬑ Backlinks Demo: The Root Article` link above the title
2. **At the bottom** — a "Referenced by" section showing "Backlinks Demo: Second Child" (which backlinks here)

## Frontmatter used

```yaml
backlink: backlinks-demo-root
```

That's it — the slug of the parent article. The system resolves the title and path automatically from the router.

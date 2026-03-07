---
title: "Backlinks Demo: Second Child"
date: 2026-03-04T00:00:00.000+00:00
lang: en
duration: 1
type: note
backlink: backlinks-demo-child-1
tags:
  - demo
  - backlinks
---

This is the **end of the chain**. It backlinks to "First Child", not to the root.

You should see:

1. **At the top** — `⬑ Backlinks Demo: First Child`
2. **At the bottom** — no "Referenced by" section (nothing backlinks to this article)

## The full chain

```
Root Article
  ← First Child (backlinks to root)    ← you see referenced-by on root
    ← This Article (backlinks to first child)  ← you see referenced-by on first child
```

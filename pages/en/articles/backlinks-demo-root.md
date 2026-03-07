---
title: "Backlinks Demo: The Root Article"
date: 2026-03-06T00:00:00.000+00:00
lang: en
duration: 2
type: note
tags:
  - demo
  - backlinks
---

[[toc]]

This article is the **root** of a backlink chain. It has no `backlink` field itself — it's the top-level parent.

## What to check

Open this article and scroll to the bottom. You should see a **"Referenced by"** section listing articles that point back here via their `backlink` frontmatter field.

## The chain

```
this article
  ← Backlinks Demo: First Child (backlinks here)
    ← Backlinks Demo: Second Child (backlinks to First Child)
```

Each child article has `backlink: backlinks-demo-root` (or the respective parent slug) in its frontmatter.

> [!TIP]
> If the "Referenced by" section is empty, make sure the child articles exist and have `backlink` set correctly.

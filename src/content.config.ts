import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { glob } from 'astro/loaders'

const articleSchema = z.object({
  title: z.string().optional(),
  display: z.string().optional(),
  date: z.coerce.date().optional(),
  updated: z.coerce.date().optional(),
  lang: z.string().optional(),
  description: z.string().optional(),
  subtitle: z.string().optional(),
  type: z.string().optional(),
  draft: z.boolean().optional(),
  open: z.boolean().optional(),
  profile: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  // Deprecated alias of `tags`; normalized in utils/posts.ts.
  hashtags: z.array(z.string()).optional(),
  art: z.string().optional(),
  audio: z.union([
    z.boolean(),
    z.object({
      url: z.string().optional(),
      duration: z.string().optional(),
      title: z.string().optional(),
      artist: z.string().optional(),
      downloadUrl: z.string().optional(),
      sourceTextUpdatedAt: z.coerce.date().optional(),
    }),
  ]).optional(),
  image: z.string().optional(),
  duration: z.union([z.number(), z.string()]).optional(),
  place: z.string().optional(),
  placeLink: z.string().optional(),
  redirect: z.string().optional(),
  robots: z.string().optional(),
  excerpt: z.string().optional(),
  upcoming: z.boolean().optional(),
  // Backlinks are raw slug strings; cross-locale resolution happens in
  // utils/posts.ts (with a build-time warning for unknown slugs), which is
  // more ergonomic than Astro's locale-prefixed reference() for this scheme.
  backlink: z.union([z.string(), z.array(z.string())]).optional(),
  tocAlwaysOn: z.boolean().optional(),
  pic: z.object({
    src: z.string(),
    r: z.string().optional(),
    link: z.string().optional(),
    text: z.string().optional(),
  }).optional(),
  recording: z.string().optional(),
  mastodon: z.string().optional(),
  telegram: z.string().optional(),
  twitter: z.string().optional(),
  sources: z.boolean().optional(),
  class: z.string().optional(),
  wrapperClass: z.string().optional(),
})

export const collections = {
  articles: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
    schema: articleSchema,
  }),
}

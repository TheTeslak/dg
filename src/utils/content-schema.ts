import { z } from 'astro/zod'

export const localeSchema = z.enum(['en', 'ru', 'es', 'pt', 'de', 'fr'])
export const artSchema = z.enum(['random', 'plum', 'dots', 'cellular', 'topography', 'interference'])
export const articleTypeSchema = z.enum(['blog', 'note', 'draft', 'blog+draft', 'note+draft'])

export const articleSchema = z.object({
  title: z.string().min(1),
  display: z.string().min(1).optional(),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  lang: localeSchema,
  description: z.string().min(1).optional(),
  subtitle: z.string().min(1).optional(),
  type: articleTypeSchema.default('blog'),
  draft: z.boolean().optional(),
  open: z.boolean().optional(),
  profile: z.boolean().optional(),
  tags: z.array(z.string().min(1)).optional(),
  hashtags: z.array(z.string().min(1)).optional(),
  art: artSchema.optional(),
  audio: z.union([
    z.boolean(),
    z.object({
      url: z.string().min(1),
      duration: z.string().min(1).optional(),
      title: z.string().min(1).optional(),
      artist: z.string().min(1).optional(),
      downloadUrl: z.string().min(1).optional(),
      sourceTextUpdatedAt: z.coerce.date().optional(),
    }).strict(),
  ]).optional(),
  image: z.string().min(1).optional(),
  duration: z.union([z.number().positive(), z.string().min(1)]).optional(),
  place: z.string().min(1).optional(),
  placeLink: z.string().min(1).optional(),
  redirect: z.string().min(1).optional(),
  robots: z.string().min(1).optional(),
  excerpt: z.string().min(1).optional(),
  upcoming: z.boolean().optional(),
  backlink: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
  tocAlwaysOn: z.boolean().optional(),
  pic: z.object({
    src: z.string().min(1),
    r: z.enum(['full', 'md', 'sm']).optional(),
    link: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
  }).strict().optional(),
  recording: z.string().min(1).optional(),
  mastodon: z.string().min(1).optional(),
  telegram: z.string().min(1).optional(),
  twitter: z.string().min(1).optional(),
  sources: z.boolean().optional(),
  class: z.string().min(1).optional(),
  wrapperClass: z.string().min(1).optional(),
}).strict()

export const staticPageNameSchema = z.enum([
  'home',
  'articles',
  'notes',
  'now',
  'photos',
  'projects',
  'finds',
])

export const staticPageSchema = z.object({
  page: staticPageNameSchema,
  lang: localeSchema,
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  display: z.string().min(1).optional(),
  art: artSchema.optional(),
  avatarText: z.string().min(1).optional(),
  emailIntro: z.string().min(1).optional(),
}).strict()

export type ArticleFrontmatter = z.infer<typeof articleSchema>
export type StaticPageFrontmatter = z.infer<typeof staticPageSchema>
export type StaticPageName = z.infer<typeof staticPageNameSchema>

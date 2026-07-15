import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { articleSchema, staticPageSchema } from './utils/content-schema.ts'

export const collections = {
  articles: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
    schema: articleSchema,
  }),
  pages: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
    schema: staticPageSchema,
  }),
}

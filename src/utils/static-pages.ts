import { getEntry } from 'astro:content'
import type { SupportedLocale } from '~/locales/config'
import type { StaticPageName } from './content-schema.ts'

export async function getStaticPage(locale: SupportedLocale, page: StaticPageName) {
  const entry = await getEntry('pages', `${locale}/${page}`)
  if (!entry)
    throw new Error(`[pages] Missing content entry "${locale}/${page}".`)
  if (entry.data.lang !== locale || entry.data.page !== page) {
    throw new Error(
      `[pages] ${entry.id}: frontmatter must declare lang="${locale}" and page="${page}".`,
    )
  }
  return entry
}

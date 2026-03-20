import type { RouteRecordNormalized } from 'vue-router'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isPostVisible } from '~/logics'
import { getLocaleFromPath } from '~/logics/i18n-path'

interface BacklinkInfo {
  path: string
  title: string
  lang?: string
  type?: string
}

interface ReferencedByInfo {
  path: string
  title: string
  date: string
  updated?: string
  lang?: string
  type?: string
}

/**
 * Extract the article slug from a route path.
 * E.g. `/en/articles/about-yak-shaving` → `about-yak-shaving`
 */
function slugFromPath(path: string): string | undefined {
  const match = path.match(/\/articles\/([^/]+)$/)
  return match?.[1]
}

/**
 * Resolve the backlink for the current article.
 * Returns route info for the article that the current article "backlinks" to.
 */
export function useBacklink() {
  const router = useRouter()
  const route = useRoute()

  const currentLocale = computed(() => getLocaleFromPath(route.path))

  const backlinkSlugs = computed<string[]>(() => {
    const raw = route.meta.frontmatter?.backlink
    if (!raw)
      return []
    const list = Array.isArray(raw) ? raw : [raw]
    return [...new Set(list)]
  })

  const backlinks = computed<BacklinkInfo[]>(() => {
    const slugs = backlinkSlugs.value
    if (slugs.length === 0)
      return []

    const results: BacklinkInfo[] = []

    for (const slug of slugs) {
      const targetPath = `/${currentLocale.value}/articles/${slug}`
      const found = router.getRoutes().find(
        (r: RouteRecordNormalized) =>
          r.path === targetPath
          && r.meta.frontmatter?.title
          && isPostVisible(r.meta.frontmatter || {}),
      )
      if (found) {
        const fm = found.meta.frontmatter!
        results.push({
          path: found.path,
          title: fm.title as string,
          lang: fm.lang as string | undefined,
          type: fm.type as string | undefined,
        })
      }
    }

    return results
  })

  return { backlinks }
}

/**
 * Find all articles that backlink TO the current article.
 * I.e. articles whose frontmatter.backlink contains currentSlug.
 */
export function useReferencedBy() {
  const router = useRouter()
  const route = useRoute()

  const currentLocale = computed(() => getLocaleFromPath(route.path))
  const currentSlug = computed(() => slugFromPath(route.path))

  const referencedBy = computed<ReferencedByInfo[]>(() => {
    const slug = currentSlug.value
    if (!slug)
      return []

    return router.getRoutes()
      .filter((r: RouteRecordNormalized) => {
        if (!r.path.startsWith(`/${currentLocale.value}/articles/`))
          return false
        if (!r.meta.frontmatter?.title || !isPostVisible(r.meta.frontmatter || {}))
          return false

        const rawBacklink = r.meta.frontmatter?.backlink
        if (!rawBacklink)
          return false

        const bLinks = Array.isArray(rawBacklink) ? rawBacklink : [rawBacklink]
        return bLinks.includes(slug)
      })
      .map(r => ({
        path: r.path,
        title: r.meta.frontmatter!.title as string,
        date: r.meta.frontmatter!.date as string,
        updated: r.meta.frontmatter!.updated as string | undefined,
        lang: r.meta.frontmatter!.lang as string | undefined,
        type: r.meta.frontmatter!.type as string | undefined,
      }))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  })

  return { referencedBy }
}

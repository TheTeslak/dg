import type { RouteRecordNormalized } from 'vue-router'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getLocaleFromPath } from '~/logics/i18n-path'

interface BacklinkInfo {
  path: string
  title: string
  lang?: string
}

interface ReferencedByInfo {
  path: string
  title: string
  date: string
  lang?: string
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

  const backlinkSlug = computed(() => route.meta.frontmatter?.backlink as string | undefined)

  const backlink = computed<BacklinkInfo | null>(() => {
    const slug = backlinkSlug.value
    if (!slug)
      return null

    const targetPath = `/${currentLocale.value}/articles/${slug}`
    const found = router.getRoutes().find(
      (r: RouteRecordNormalized) =>
        r.path === targetPath && r.meta.frontmatter?.title,
    )
    if (!found)
      return null

    const fm = found.meta.frontmatter!
    return {
      path: found.path,
      title: fm.title as string,
      lang: fm.lang as string | undefined,
    }
  })

  return { backlink }
}

/**
 * Find all articles that backlink TO the current article.
 * I.e. articles whose frontmatter.backlink === currentSlug.
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
      .filter((r: RouteRecordNormalized) =>
        r.path.startsWith(`/${currentLocale.value}/articles/`)
        && r.meta.frontmatter?.backlink === slug
        && r.meta.frontmatter?.title
        && !r.meta.frontmatter?.draft,
      )
      .map(r => ({
        path: r.path,
        title: r.meta.frontmatter!.title as string,
        date: r.meta.frontmatter!.date as string,
        lang: r.meta.frontmatter!.lang as string | undefined,
      }))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  })

  return { referencedBy }
}

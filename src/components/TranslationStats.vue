<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { localeConfig, supportedLocales } from '~/locales/config'
import { getLocaleFromPath } from '~/logics/i18n-path'
import { isPostVisible } from '~/logics/post-visibility'

const router = useRouter()

const stats = computed(() => {
  const routes = router.getRoutes()
  const seen = new Set<string>()
  const physicalArticles: Array<{ slug: string, locale: string }> = []

  for (const r of routes) {
    if (r.meta.isArticle !== true)
      continue

    const frontmatter = (r.meta.frontmatter || {}) as Record<string, any>
    if (!isPostVisible(frontmatter))
      continue

    const slug = r.meta.articleSlug as string
    const sourceLocale = r.meta.articleLocale as string
    if (!slug || !sourceLocale)
      continue

    // Skip auto-generated fallback route aliases to ensure stats represent actual physical translations.
    const urlLocale = getLocaleFromPath(r.path)
    if (urlLocale !== sourceLocale)
      continue

    const key = `${sourceLocale}/${slug}`
    if (!seen.has(key)) {
      seen.add(key)
      physicalArticles.push({ slug, locale: sourceLocale })
    }
  }

  const uniqueSlugs = new Set(physicalArticles.map(a => a.slug))
  const totalArticles = uniqueSlugs.size

  if (totalArticles === 0)
    return []

  return supportedLocales.map((locale) => {
    const count = physicalArticles.filter(a => a.locale === locale).length
    return {
      locale,
      name: localeConfig[locale].nativeName,
      count,
      total: totalArticles,
      percentage: Math.round((count / totalArticles) * 100),
    }
  }).sort((a, b) => b.percentage - a.percentage)
})

const CIRCUMFERENCE = 2 * Math.PI * 16
</script>

<template>
  <div
    v-if="stats.length"
    class="translation-stats grid grid-cols-1 md:grid-cols-3 gap-[2px] my-6"
  >
    <div
      v-for="item in stats"
      :key="item.locale"
      class="translation-stats-item pl-4 pr-5 py-3 flex items-center justify-between"
    >
      <span class="font-sans font-medium">
        {{ item.name }}
      </span>

      <div class="flex items-center gap-3">
        <span class="font-sans text-right">
          {{ item.percentage }}%
        </span>

        <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 36 36" style="transform: rotate(-90deg)">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            stroke-width="3.5"
            opacity="0.15"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            stroke-width="3.5"
            stroke-linecap="round"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="CIRCUMFERENCE - (CIRCUMFERENCE * item.percentage) / 100"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.translation-stats {
  border-radius: 0.5rem;
  overflow: hidden;
}
.translation-stats-item {
  background: rgba(125, 125, 125, 0.08);
}
</style>

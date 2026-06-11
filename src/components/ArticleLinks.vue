<script setup lang="ts">
import type { RouteRecordNormalized } from 'vue-router'
import { getArticlePath } from '~/logics/article-path'
import { getLocaleFromPath } from '~/logics/i18n-path'

const props = defineProps<{
  links: string[]
}>()

const router = useRouter()
const route = useRoute()

const currentLocale = computed(() => {
  return getLocaleFromPath(route.path)
})

interface LinkedArticle {
  path: string
  title: string
  description: string
}

const articles = computed<LinkedArticle[]>(() => {
  const allRoutes = router.getRoutes()

  return props.links
    .map((slug) => {
      // Match the current locale first. This also handles fallback aliases.
      const articlePath = getArticlePath(currentLocale.value, slug)
      const matched = allRoutes.find((r: RouteRecordNormalized) => {
        return r.meta.isArticle === true && r.path === articlePath
      })

      if (!matched?.meta?.frontmatter?.title)
        return null

      const fm = matched.meta.frontmatter as Record<string, any>
      return {
        path: matched.path,
        title: fm.title,
        description: fm.excerpt || fm.description || '',
      }
    })
    .filter(Boolean) as LinkedArticle[]
})
</script>

<template>
  <div v-if="articles.length" class="article-links">
    <RouterLink
      v-for="article in articles"
      :key="article.path"
      :to="article.path"
      class="article-link-card"
    >
      <span class="article-link-title">{{ article.title }}</span>
      <span class="article-link-excerpt">
        {{ article.description || article.title }}
      </span>
    </RouterLink>
  </div>
</template>

<style scoped>
.article-links {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 1rem 0;
}

.article-link-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.15rem 0;
  border: 1px solid rgba(125, 125, 125, 0.25);
  border-radius: 0.5rem;
  text-decoration: none !important;
  transition: all 0.25s ease;
  opacity: 0.65;
  overflow: hidden;
}

.article-link-card:hover {
  opacity: 1;
  border-color: rgba(125, 125, 125, 0.35);
  background: rgba(125, 125, 125, 0.06);
}

.article-link-title {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
}

.article-link-excerpt {
  font-size: 1rem;
  line-height: 1.5;
  height: 4.125em; /* 2.75 lines — cut by card border */
  opacity: 0.55;
  -webkit-mask-image: linear-gradient(to bottom, black 20%, rgba(0, 0, 0, 0.15) 100%);
  mask-image: linear-gradient(to bottom, black 20%, rgba(0, 0, 0, 0.15) 100%);
}

.dark .article-link-card {
  border-color: rgba(125, 125, 125, 0.4);
}

.dark .article-link-card:hover {
  border-color: rgba(125, 125, 125, 0.5);
  background: rgba(125, 125, 125, 0.08);
}
</style>

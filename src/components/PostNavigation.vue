<script setup lang="ts">
import type { RouteRecordNormalized } from 'vue-router'
import type { Post } from '~/types'
import { formatDate, isDraftPost, isPostVisible, isRecentPost } from '~/logics'
import { getLocaleFromPath } from '~/logics/i18n-path'

const props = defineProps<{
  currentPath: string
  type?: string
}>()

const router = useRouter()
const route = useRoute()

const currentLocale = computed(() => {
  return getLocaleFromPath(route.path)
})

const postType = computed(() => props.type || 'blog')

const siblings = computed<Post[]>(() => {
  return router.getRoutes()
    .filter((r: RouteRecordNormalized) =>
      r.path.startsWith(`/${currentLocale.value}/articles`)
      && isPostVisible(r.meta.frontmatter || {}),
    )
    .filter((r: RouteRecordNormalized) =>
      !r.path.endsWith('.html')
      && (r.meta.frontmatter?.type || 'blog').split('+').includes(postType.value),
    )
    .map((r: RouteRecordNormalized) => ({
      path: r.path,
      title: r.meta.frontmatter?.title,
      date: r.meta.frontmatter?.date,
      updated: r.meta.frontmatter?.updated,
      lang: r.meta.frontmatter?.lang,
      duration: r.meta.frontmatter?.duration,
      type: r.meta.frontmatter?.type,
    }))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
})

const currentIndex = computed(() => {
  return siblings.value.findIndex(p => p.path === props.currentPath)
})

const newerPost = computed(() => {
  if (currentIndex.value <= 0)
    return null
  return siblings.value[currentIndex.value - 1]
})
const olderPost = computed(() => {
  if (currentIndex.value < 0 || currentIndex.value >= siblings.value.length - 1)
    return null
  return siblings.value[currentIndex.value + 1]
})

const hasNavigation = computed(() => newerPost.value || olderPost.value)
</script>

<template>
  <nav
    v-if="hasNavigation"
    class="post-nav"
    flex="~ col sm:row gap-3 sm:gap-4"
    items-stretch
  >
    <RouterLink
      v-if="newerPost"
      :to="newerPost.path"
      class="post-nav-link post-nav-newer flex-1"
      flex="~ gap-3 items-center"
    >
      <div
        i-ri:arrow-left-s-line
        flex-none text-lg op40
      />
      <div flex="~ col" min-w-0>
        <span class="post-nav-title" text-base leading-snug>
          {{ newerPost.title }}
        </span>
        <span class="post-nav-date" text-base op45 mt-0.5>
          <span v-if="isDraftPost(newerPost.type)">🚧 </span>
          <span v-if="isRecentPost(newerPost.date, newerPost.updated) && !isDraftPost(newerPost.type)">🌱 </span>{{ formatDate(newerPost.date, false) }}
        </span>
      </div>
    </RouterLink>

    <div v-if="!newerPost" flex-1 />

    <RouterLink
      v-if="olderPost"
      :to="olderPost.path"
      class="post-nav-link post-nav-older flex-1"
      flex="~ gap-3 items-center justify-end"
    >
      <div flex="~ col items-end" min-w-0>
        <span class="post-nav-title" text-base leading-snug text-right>
          {{ olderPost.title }}
        </span>
        <span class="post-nav-date" text-base op45 mt-0.5>
          <span v-if="isDraftPost(olderPost.type)">🚧 </span>
          <span v-if="isRecentPost(olderPost.date, olderPost.updated) && !isDraftPost(olderPost.type)">🌱 </span>{{ formatDate(olderPost.date, false) }}
        </span>
      </div>
      <div
        i-ri:arrow-right-s-line
        flex-none text-lg op40
      />
    </RouterLink>

    <div v-if="!olderPost" flex-1 />
  </nav>
</template>

<style scoped>
.post-nav-link {
  padding: 0.75rem 1rem;
  border: 1px solid rgba(125, 125, 125, 0.25);
  border-radius: 0.5rem;
  text-decoration: none !important;
  transition: all 0.25s ease;
  opacity: 0.65;
}

.post-nav-link:hover {
  opacity: 1;
  border-color: rgba(125, 125, 125, 0.35);
  background: rgba(125, 125, 125, 0.06);
}

.post-nav-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .post-nav-link {
  border-color: rgba(125, 125, 125, 0.4);
}

.dark .post-nav-link:hover {
  border-color: rgba(125, 125, 125, 0.5);
  background: rgba(125, 125, 125, 0.08);
}
</style>

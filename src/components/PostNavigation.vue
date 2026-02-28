<script setup lang="ts">
import type { Post } from '~/types'
import type { RouteRecordNormalized } from 'vue-router'
import { formatDate } from '~/logics'

const props = defineProps<{
  currentPath: string
  type?: string
}>()

const router = useRouter()
const route = useRoute()

const supportedLocales = ['en', 'ru', 'es']

const currentLocale = computed(() => {
  const pathLocale = route.path.split('/')[1]
  return supportedLocales.includes(pathLocale) ? pathLocale : 'en'
})

const postType = computed(() => props.type || 'blog')

const siblings = computed<Post[]>(() => {
  return router.getRoutes()
    .filter((r: RouteRecordNormalized) =>
      supportedLocales.some(l => r.path.startsWith(`/${l}/articles`))
      && r.meta.frontmatter?.date
      && !r.meta.frontmatter?.draft
    )
    .filter((r: RouteRecordNormalized) =>
      !r.path.endsWith('.html')
      && (r.meta.frontmatter?.type || 'blog').split('+').includes(postType.value)
    )
    .map((r: RouteRecordNormalized) => ({
      path: r.path,
      title: r.meta.frontmatter?.title,
      date: r.meta.frontmatter?.date,
      lang: r.meta.frontmatter?.lang,
      duration: r.meta.frontmatter?.duration,
    }))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
})

const currentIndex = computed(() => {
  return siblings.value.findIndex(p => p.path === props.currentPath)
})

const newerPost = computed(() => {
  if (currentIndex.value <= 0) return null
  return siblings.value[currentIndex.value - 1]
})
const olderPost = computed(() => {
  if (currentIndex.value < 0 || currentIndex.value >= siblings.value.length - 1) return null
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
      class="post-nav-link post-nav-newer"
      flex="~ gap-3 items-center"
      :class="{ 'flex-1': true }"
    >
      <div
        i-ri:arrow-left-s-line
        flex-none text-lg op40
      />
      <div flex="~ col" min-w-0>
        <span class="post-nav-title" text-sm leading-snug>
          {{ newerPost.title }}
        </span>
        <span class="post-nav-date" text-xs op40 mt-0.5>
          {{ formatDate(newerPost.date, false) }}
        </span>
      </div>
    </RouterLink>

    <div v-if="!newerPost" flex-1 />

    <RouterLink
      v-if="olderPost"
      :to="olderPost.path"
      class="post-nav-link post-nav-older"
      flex="~ gap-3 items-center justify-end"
      :class="{ 'flex-1': true }"
    >
      <div flex="~ col items-end" min-w-0>
        <span class="post-nav-title" text-sm leading-snug text-right>
          {{ olderPost.title }}
        </span>
        <span class="post-nav-date" text-xs op40 mt-0.5>
          {{ formatDate(olderPost.date, false) }}
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
  border: 1px solid rgba(125, 125, 125, 0.15);
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
  border-color: rgba(125, 125, 125, 0.2);
}

.dark .post-nav-link:hover {
  border-color: rgba(125, 125, 125, 0.4);
  background: rgba(125, 125, 125, 0.08);
}
</style>

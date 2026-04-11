<script setup lang="ts">
import type { RouteRecordNormalized } from 'vue-router'
import type { Post } from '~/types'
import { useFluent } from 'fluent-vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDate, formatReadingDuration, isDraftPost, isPostVisible, isRecentPost, onlyLanguage } from '~/logics'
import { getLocaleFromPath } from '~/logics/i18n-path'

const props = defineProps<{
  type?: string
  posts?: Post[]
  extra?: Post[]
}>()

const fluent = useFluent()
const router = useRouter()
const route = useRoute()

const locale = computed(() => {
  return getLocaleFromPath(route.path)
})

const routes = computed<Post[]>(() => {
  return router.getRoutes()
    .filter((r: RouteRecordNormalized) =>
      r.path.startsWith(`/${locale.value}/articles`)
      && isPostVisible(r.meta.frontmatter || {}),
    )
    .filter((r: RouteRecordNormalized) =>
      !r.path.endsWith('.html')
      && (r.meta.frontmatter?.type || 'blog').split('+').includes(props.type),
    )
    .map((r: RouteRecordNormalized) => ({
      path: r.meta.frontmatter?.redirect || r.path,
      title: r.meta.frontmatter?.title,
      date: r.meta.frontmatter?.date,
      updated: r.meta.frontmatter?.updated,
      lang: r.meta.frontmatter?.lang,
      duration: r.meta.frontmatter?.duration,
      recording: r.meta.frontmatter?.recording,
      upcoming: r.meta.frontmatter?.upcoming,
      redirect: r.meta.frontmatter?.redirect,
      place: r.meta.frontmatter?.place,
      type: r.meta.frontmatter?.type,
    }))
})

const posts = computed(() => {
  const list = [...(props.posts || routes.value), ...props.extra || []]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))

  if (onlyLanguage.value) {
    return list.filter((i) => {
      const articleLang = i.lang
      if (articleLang && articleLang !== locale.value)
        return false
      return true
    })
  }
  return list
})

const getYear = (a: Date | string | number) => new Date(a).getFullYear()
const isFuture = (a?: Date | string | number) => a && new Date(a) > new Date()
const isSameYear = (a?: Date | string | number, b?: Date | string | number) => a && b && getYear(a) === getYear(b)
function isSameGroup(a: Post, b?: Post) {
  return (isFuture(a.date) === isFuture(b?.date)) && isSameYear(a.date, b?.date)
}

function getGroupName(p: Post) {
  if (isFuture(p.date))
    return fluent.format('blog-upcoming')
  return getYear(p.date)
}

function getPostLangTag(post: Post) {
  const articleLang = post.lang
  if (articleLang && articleLang !== locale.value) {
    return articleLang.toUpperCase()
  }
  return null
}

function getDurationLabel(duration?: Post['duration']) {
  return formatReadingDuration(duration, locale.value)
}
</script>

<template>
  <ul role="list">
    <template v-if="!posts.length">
      <div role="listitem" py2 op50>
        {{ $t('blog-nothing-here') }}
      </div>
    </template>

    <template v-for="route, idx in posts" :key="route.path">
      <div
        v-if="!isSameGroup(route, posts[idx - 1])"
        role="listitem"
        select-none relative h20 pointer-events-none slide-enter
        :style="{
          '--enter-stage': idx - 2,
          '--enter-step': '60ms',
        }"
      >
        <span text-8em color-transparent absolute left--3rem top--2rem font-bold text-stroke-2 text-stroke-hex-aaa op10>{{ getGroupName(route) }}</span>
      </div>
      <div
        role="listitem"
        class="slide-enter"
        :style="{
          '--enter-stage': idx,
          '--enter-step': '60ms',
        }"
      >
        <component
          :is="route.path.includes('://') ? 'a' : 'RouterLink'"
          v-bind="
            route.path.includes('://') ? {
              href: route.path,
              target: '_blank',
              rel: 'noopener noreferrer',
            } : {
              to: route.path,
            }
          "
          class="item block font-normal mb-6 mt-2 no-underline"
        >
          <div
            class="no-underline"
            flex="~ col md:row gap-2 md:items-center"
          >
            <div class="title text-xl leading-1.2em" flex="~ gap-2 wrap">
              <span
                v-if="getPostLangTag(route)"
                align-middle flex-none
                class="text-xs bg-zinc:15 text-[#91919b] rounded px-1 py-0.5 ml--10 mr2 my-auto hidden md:block"
              >{{ getPostLangTag(route) }}</span>
              <span align-middle>{{ route.title }}</span>
              <span
                v-if="route.redirect"
                align-middle op50 flex-none text-xs ml--1.5
                i-carbon-arrow-up-right
                title="External"
                aria-hidden="true"
              />
            </div>

            <div flex="~ gap-2 items-center">
              <span
                v-if="route.inperson"
                align-middle op50 flex-none
                i-ri:group-2-line
                title="In person"
              />
              <span
                v-if="route.recording || route.video"
                align-middle op50 flex-none
                i-ri:film-line
                title="Provided in video"
              />
              <span
                v-if="route.radio"
                align-middle op50 flex-none
                i-ri:radio-line
                title="Provided in radio"
              />

              <span text-xl op60 ws-nowrap>
                <span v-if="isDraftPost(route.type)" role="img" aria-label="Draft">🚧 </span>
                <span v-if="isRecentPost(route.date, route.updated) && !isDraftPost(route.type)" role="img" aria-label="Recent">🌱 </span>{{ formatDate(route.date, true) }}
              </span>
              <span v-if="getDurationLabel(route.duration)" text-xl op60 ws-nowrap>· {{ getDurationLabel(route.duration) }}</span>
              <span v-if="route.platform" text-xl op60 ws-nowrap>· {{ route.platform }}</span>
              <span v-if="route.place" text-xl op60 ws-nowrap md:hidden>· {{ route.place }}</span>
              <span
                v-if="getPostLangTag(route)"
                align-middle flex-none
                class="text-xs bg-zinc:15 text-[#91919b] rounded px-1 py-0.5 my-auto md:hidden"
              >{{ getPostLangTag(route) }}</span>
            </div>
          </div>
          <div v-if="route.place" op45 text-xl hidden mt--2 md:block>
            {{ route.place }}
          </div>
        </component>
      </div>
    </template>
  </ul>
</template>

<script setup lang='ts'>
import { useFluent } from 'fluent-vue'
import { formatDate, formatReadingDuration, resolvePath } from '~/logics'
import { getLocaleFromPath } from '~/logics/i18n-path'

const { frontmatter } = defineProps({
  frontmatter: {
    type: Object,
    required: true,
  },
})

const fluent = useFluent()
const router = useRouter()
const route = useRoute()
const content = ref<HTMLDivElement>()

const currentLocale = computed(() => {
  return getLocaleFromPath(route.path)
})

const localizedDuration = computed(() => {
  return formatReadingDuration(frontmatter.duration, currentLocale.value)
})

/**
 * Determine the content type from frontmatter.
 * Notes have type 'note', articles have no type (defaults to 'blog').
 */
const postType = computed(() => {
  const type = frontmatter.type || 'blog'
  if (type.split('+').includes('note'))
    return 'note'
  return 'blog'
})

/**
 * Link back to the listing page for the current content type.
 */
const backToAllPath = computed(() => {
  if (postType.value === 'note')
    return `/${currentLocale.value}/notes`
  return `/${currentLocale.value}/articles`
})

onMounted(() => {
  const navigate = () => {
    if (location.hash) {
      const el = document.querySelector(decodeURIComponent(location.hash))
      if (el) {
        const rect = el.getBoundingClientRect()
        const y = window.scrollY + rect.top - 40
        window.scrollTo({
          top: y,
          behavior: 'smooth',
        })
        return true
      }
    }
  }

  const handleAnchors = (
    event: MouseEvent & { target: HTMLElement },
  ) => {
    const link = event.target.closest('a')

    if (
      !event.defaultPrevented
      && link
      && event.button === 0
      && link.target !== '_blank'
      && link.rel !== 'external'
      && !link.download
      && !event.metaKey
      && !event.ctrlKey
      && !event.shiftKey
      && !event.altKey
    ) {
      const url = new URL(link.href)
      if (url.origin !== window.location.origin)
        return

      event.preventDefault()
      const { pathname, hash } = url

      const resolvedPath = resolvePath(pathname, route.path)

      if (hash && (!pathname || pathname === location.pathname)) {
        window.history.replaceState({}, '', hash)
        navigate()
      }
      else {
        router.push({ path: resolvedPath, hash })
      }
    }
  }

  useEventListener(window, 'hashchange', navigate)
  useEventListener(content.value!, 'click', handleAnchors, { passive: false })

  // Heading copy-link feature
  const tooltipDefault = fluent.format('heading-link')
  const tooltipCopied = fluent.format('heading-copied')

  const headings = content.value!.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')
  headings.forEach((heading) => {
    heading.setAttribute('data-tooltip', tooltipDefault)
  })

  useEventListener(content.value!, 'click', (event: MouseEvent & { target: HTMLElement }) => {
    // Skip if clicking on the anchor # link itself — let handleAnchors deal with it
    if (event.target.closest('a.header-anchor'))
      return

    const heading = event.target.closest<HTMLElement>('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')
    if (!heading)
      return

    const url = `${location.origin}${location.pathname}#${heading.id}`
    navigator.clipboard.writeText(url).then(() => {
      heading.setAttribute('data-tooltip', tooltipCopied)
      setTimeout(() => {
        heading.setAttribute('data-tooltip', tooltipDefault)
      }, 2000)
    })
  }, { passive: true })

  setTimeout(() => {
    if (!navigate())
      setTimeout(navigate, 1000)
  }, 1)
})

const ArtComponent = computed(() => {
  let art = frontmatter.art
  if (art === 'random')
    art = Math.random() > 0.5 ? 'plum' : 'dots'
  if (typeof window !== 'undefined') {
    if (art === 'plum')
      return defineAsyncComponent(() => import('./ArtPlum.vue'))
    else if (art === 'dots')
      return defineAsyncComponent(() => import('./ArtDots.vue'))
  }
  return undefined
})
</script>

<template>
  <ClientOnly v-if="ArtComponent">
    <component :is="ArtComponent" />
  </ClientOnly>
  <div
    v-if="frontmatter.display ?? frontmatter.title"
    class="prose m-auto mb-8"
    :lang="frontmatter.lang"
    :class="[frontmatter.wrapperClass]"
  >
    <h1 class="mb-0 slide-enter-50">
      {{ frontmatter.display ?? frontmatter.title }}
    </h1>
    <p
      v-if="frontmatter.date"
      class="opacity-50 !-mt-6 slide-enter-50"
    >
      {{ formatDate(frontmatter.date, false) }} <span v-if="localizedDuration">· {{ localizedDuration }}</span>
    </p>
    <p v-if="frontmatter.place" class="mt--4!">
      <span op50>at </span>
      <a v-if="frontmatter.placeLink" :href="frontmatter.placeLink" target="_blank">
        {{ frontmatter.place }}
      </a>
      <span v-else font-bold>
        {{ frontmatter.place }}
      </span>
    </p>
    <p
      v-if="frontmatter.subtitle"
      class="opacity-50 !-mt-6 italic slide-enter"
    >
      {{ frontmatter.subtitle }}
    </p>
    <p
      v-if="frontmatter.draft"
      class="slide-enter" bg-orange-4:10 text-orange-4 border="l-3 orange-4" px4 py2
    >
      {{ $t('blog-draft') }}
    </p>
  </div>
  <NotTranslatedBanner
    v-if="frontmatter.originalLocale && frontmatter.originalLocale !== currentLocale"
    :original-locale="frontmatter.originalLocale"
  />
  <ScrollProgressToc
    v-if="frontmatter.title"
    :title="frontmatter.display ?? frontmatter.title"
    :duration="localizedDuration"
  />
  <article
    ref="content"
    :lang="frontmatter.lang"
    :class="[frontmatter.tocAlwaysOn ? 'toc-always-on' : '', frontmatter.class]"
  >
    <slot />
  </article>
  <div v-if="route.path !== '/' && frontmatter.date" class="prose m-auto mt-8 mb-8 slide-enter animate-delay-500 print:hidden">
    <template v-if="frontmatter.telegram || frontmatter.mastodon">
      <span font-mono op50>> </span>
      <span op50>{{ $t('post-comment-on') }}&nbsp;</span>
      <a v-if="frontmatter.telegram" :href="frontmatter.telegram" target="_blank" op50>{{ $t('post-link-telegram') }}</a>
      <span v-if="frontmatter.telegram && frontmatter.mastodon" op25> / </span>
      <a v-if="frontmatter.mastodon" :href="frontmatter.mastodon" target="_blank" op50>{{ $t('post-link-mastodon') }}</a>
    </template>

    <!-- Prev / Next chronological navigation -->
    <PostNavigation
      v-if="frontmatter.date"
      :current-path="route.path"
      :type="postType"
      class="mt-6 mb-4"
    />

    <!-- Back to listing -->
    <span font-mono op50>> </span>
    <RouterLink
      :to="backToAllPath"
      class="font-mono op50 hover:op75"
      v-text="$t('action-back-to-all')"
    />
  </div>
</template>

<script setup lang='ts'>
import { useHead } from '@unhead/vue'
import { useFluent } from 'fluent-vue'
import { formatDate, formatReadingDuration, resolvePath } from '~/logics'
import { useBacklink, useReferencedBy } from '~/logics/backlinks'
import { getLocaleFromPath, supportedLocales } from '~/logics/i18n-path'

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

const { backlink } = useBacklink()
const { referencedBy } = useReferencedBy()

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

/**
 * SEO: Generate <link rel="alternate" hreflang="xx"> tags for all locales.
 * Tells search engines that this page exists in multiple languages,
 * preventing duplicate content penalties and enabling proper language indexing.
 */
const siteOrigin = 'https://antfu.me'

const hreflangLinks = computed(() => {
  const path = route.path
  // Extract the locale-independent part: /en/articles/foo → /articles/foo
  const match = path.match(/^\/(en|ru|es)(\/.+)$/)
  if (!match)
    return []

  const pathSuffix = match[2] // e.g. "/articles/foo"

  const links: { rel: string, hreflang: string, href: string }[] = supportedLocales.map(locale => ({
    rel: 'alternate',
    hreflang: locale,
    href: `${siteOrigin}/${locale}${pathSuffix}`,
  }))

  // x-default: tells Google which version to show when no locale matches
  links.push({
    rel: 'alternate',
    hreflang: 'x-default',
    href: `${siteOrigin}/en${pathSuffix}`,
  })

  return links
})

useHead({
  link: hreflangLinks,
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
  if (art === 'random') {
    const weighted = [
      'plum',
      'plum',
      'plum',
      'dots',
      'dots',
      'cellular',
      'cellular',
    ]
    const lastArt = typeof window !== 'undefined' ? localStorage.getItem('dg-last-art') : null
    const filtered = lastArt ? weighted.filter(a => a !== lastArt) : weighted
    const pool = filtered.length > 0 ? filtered : weighted
    art = pool[Math.floor(Math.random() * pool.length)]
    if (typeof window !== 'undefined')
      localStorage.setItem('dg-last-art', art)
  }
  if (typeof window !== 'undefined') {
    if (art === 'plum')
      return defineAsyncComponent(() => import('./ArtPlum.vue'))
    else if (art === 'dots')
      return defineAsyncComponent(() => import('./ArtDots.vue'))
    else if (art === 'cellular')
      return defineAsyncComponent(() => import('./ArtCellular.vue'))
    else if (art === 'topography')
      return defineAsyncComponent(() => import('./ArtTopography.vue'))
    else if (art === 'interference')
      return defineAsyncComponent(() => import('./ArtInterference.vue'))
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
    <div
      v-if="backlink"
      class="backlink-header slide-enter-50"
    >
      <RouterLink :to="backlink.path" class="backlink-link">
        <div i-ri:corner-left-up-line class="backlink-icon" />
        <span>{{ backlink.title }}</span>
        <span
          v-if="backlink.lang && backlink.lang !== currentLocale"
          class="backlink-lang-tag"
        >{{ backlink.lang.toUpperCase() }}</span>
      </RouterLink>
    </div>
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

    <!-- Referenced By (articles that backlink to this one) -->
    <div v-if="referencedBy.length" class="referenced-by mt-9">
      <div class="referenced-by-label">
        <div i-ri:links-line class="referenced-by-label-icon" />
        <span>{{ $t('post-referenced-by') }}</span>
      </div>
      <div v-for="ref in referencedBy" :key="ref.path" class="referenced-by-item">
        <RouterLink :to="ref.path" class="referenced-by-link">
          <div i-ri:corner-left-up-line class="backlink-icon" />
          <span>{{ ref.title }}</span>
        </RouterLink>
        <span
          v-if="ref.lang && ref.lang !== currentLocale"
          class="backlink-lang-tag"
        >{{ ref.lang.toUpperCase() }}</span>
        <span v-if="ref.date" class="referenced-by-date">
          {{ formatDate(ref.date, false) }}
        </span>
      </div>
    </div>

    <!-- Prev / Next chronological navigation -->
    <PostNavigation
      v-if="frontmatter.date"
      :current-path="route.path"
      :type="postType"
      class="mt-9 mb-6"
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

<style scoped>
.backlink-header {
  margin-bottom: 0.25rem;
}
.backlink-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  opacity: 0.4;
  text-decoration: none !important;
  transition: opacity 0.2s ease;
}
.backlink-link:hover {
  opacity: 0.75;
}
.backlink-icon {
  font-size: 0.85rem;
  flex-shrink: 0;
}
.backlink-lang-tag {
  font-size: 0.65rem;
  background: rgba(125, 125, 125, 0.15);
  color: rgba(125, 125, 125, 0.7);
  border-radius: 0.2rem;
  padding: 0.05rem 0.35rem;
  line-height: 1.2;
  flex-shrink: 0;
}

.referenced-by {
  border-top: 1px solid rgba(125, 125, 125, 0.15);
  padding-top: 1rem;
}
.referenced-by-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  opacity: 0.45;
  margin-bottom: 0.6rem;
}
.referenced-by-label-icon {
  font-size: 0.9rem;
}
.referenced-by-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}
.referenced-by-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  text-decoration: none !important;
}
.referenced-by-link:hover {
  opacity: 1;
}
.referenced-by-date {
  font-size: 0.75rem;
  opacity: 0.35;
  white-space: nowrap;
}
</style>

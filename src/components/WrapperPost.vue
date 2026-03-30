<script setup lang='ts'>
import type { GlossaryState } from '~/logics/glossary'
import { useHead } from '@unhead/vue'
import { useFluent } from 'fluent-vue'
import { formatDate, formatReadingDuration, isDraftPost, isRecentPost, resolvePath } from '~/logics'
import { useBacklink, useReferencedBy } from '~/logics/backlinks'
import { glossaryKey } from '~/logics/glossary'
import { getLocaleFromPath, supportedLocales } from '~/logics/i18n-path'
import { artOverride } from '~/logics/keyboard-nav'
import { siteOrigin } from '~/logics/site'

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
const marginNoteRef = ref<HTMLElement>()

// ── Glossary margin-note state ──
const activeGlossary = ref<GlossaryState | null>(null)
const marginNoteTop = ref(0)
const isMobileGlossary = ref(false)

function setGlossaryActive(state: GlossaryState | null) {
  activeGlossary.value = state
  if (state) {
    nextTick(() => updateMarginNotePosition())
  }
}

function updateMarginNotePosition() {
  if (!activeGlossary.value?.termEl)
    return
  const termRect = activeGlossary.value.termEl.getBoundingClientRect()
  const rawTop = termRect.top

  // Clamp to viewport bounds after the note renders
  nextTick(() => {
    const noteEl = marginNoteRef.value
    if (!noteEl)
      return
    const noteHeight = noteEl.offsetHeight
    const maxTop = window.innerHeight - noteHeight - 16
    marginNoteTop.value = Math.max(16, Math.min(rawTop, maxTop))
  })
}

function closeGlossary() {
  activeGlossary.value = null
}

function checkMobileGlossary() {
  if (typeof window !== 'undefined')
    isMobileGlossary.value = window.innerWidth < 1024
}

provide(glossaryKey, {
  active: activeGlossary,
  setActive: setGlossaryActive,
})

const { backlinks } = useBacklink()
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
  meta: [
    {
      name: 'robots',
      content: (frontmatter.draft || isDraftPost(frontmatter.type)) ? 'noindex, nofollow' : 'index, follow',
    },
  ],
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

  // ── Glossary: close on click outside ──
  useEventListener(document, 'click', (e: MouseEvent) => {
    if (!activeGlossary.value)
      return
    const target = e.target as HTMLElement
    // Don't close if clicking on the term itself (GlossaryTerm handles that with .stop)
    if (target.closest('.glossary-term'))
      return
    // Don't close if clicking on the margin note itself
    if (target.closest('.margin-note') || target.closest('.glossary-sheet'))
      return
    closeGlossary()
  })

  // ── Glossary: mobile detection ──
  checkMobileGlossary()
  useEventListener(window, 'resize', checkMobileGlossary)

  // ── Glossary: lock body scroll when mobile sheet is open ──
  watch(activeGlossary, (val) => {
    if (val && isMobileGlossary.value) {
      document.body.style.overflow = 'hidden'
    }
    else {
      document.body.style.overflow = ''
    }
  })

  setTimeout(() => {
    if (!navigate())
      setTimeout(navigate, 1000)
  }, 1)
})

const artComponentMap: Record<string, () => Promise<any>> = {
  plum: () => import('./ArtPlum.vue'),
  dots: () => import('./ArtDots.vue'),
  cellular: () => import('./ArtCellular.vue'),
  topography: () => import('./ArtTopography.vue'),
  interference: () => import('./ArtInterference.vue'),
}

const ArtComponent = computed(() => {
  // No art in frontmatter — this page has no background
  if (!frontmatter.art)
    return undefined

  // Keyboard override takes priority when set
  if (artOverride.value && artComponentMap[artOverride.value]) {
    return typeof window !== 'undefined'
      ? defineAsyncComponent(artComponentMap[artOverride.value])
      : undefined
  }

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

  if (typeof window !== 'undefined' && artComponentMap[art])
    return defineAsyncComponent(artComponentMap[art])

  return undefined
})
</script>

<template>
  <ClientOnly v-if="ArtComponent">
    <div data-art>
      <component :is="ArtComponent" />
    </div>
  </ClientOnly>
  <div
    v-if="frontmatter.display ?? frontmatter.title"
    class="prose m-auto mb-8"
    :lang="frontmatter.lang"
    :class="[frontmatter.wrapperClass]"
  >
    <div
      v-if="backlinks.length > 0"
      class="backlinks-container slide-enter-50"
    >
      <div v-for="backlink in backlinks" :key="backlink.path" class="backlink-header">
        <RouterLink :to="backlink.path" class="backlink-link">
          <div i-ri:corner-left-up-line class="backlink-icon" />
          <span>
            <span v-if="isDraftPost(backlink.type)">🚧 </span>{{ backlink.title }}
          </span>
          <span
            v-if="backlink.lang && backlink.lang !== currentLocale"
            class="text-xs bg-zinc:15 text-[#91919b] rounded px-1 py-0.5 my-auto flex-none"
          >{{ backlink.lang.toUpperCase() }}</span>
        </RouterLink>
      </div>
    </div>
    <h1 class="mb-0 slide-enter-50">
      {{ frontmatter.display ?? frontmatter.title }}
    </h1>
    <p
      v-if="frontmatter.date"
      class="!-mt-8 slide-enter-50"
    >
      <span class="opacity-50">
        <span v-if="isDraftPost(frontmatter.type)">🚧 </span>
        <span v-if="isRecentPost(frontmatter.date, frontmatter.updated) && !isDraftPost(frontmatter.type)">🌱 </span>{{ formatDate(frontmatter.date, false) }}<span v-if="frontmatter.updated"> · {{ $t('post-updated') }} {{ formatDate(frontmatter.updated, false) }}</span><span v-if="localizedDuration"> · {{ localizedDuration }}</span>
      </span>
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
    <PostDraftBanner
      v-if="frontmatter.draft || isDraftPost(frontmatter.type)"
    />
    <PostNoticeBanner
      v-if="frontmatter.originalLocale && frontmatter.originalLocale !== currentLocale && !frontmatter.draft && !isDraftPost(frontmatter.type)"
      :original-locale="frontmatter.originalLocale"
    />
  </div>
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

  <!-- Glossary: desktop margin note + mobile bottom sheet -->
  <ClientOnly>
    <Teleport to="body">
      <!-- Desktop: fixed right-margin note (mirrors ToC on left) -->
      <Transition name="margin-note">
        <div
          v-if="activeGlossary && !isMobileGlossary"
          ref="marginNoteRef"
          class="margin-note"
          :style="{ top: `${marginNoteTop}px` }"
        >
          <div class="margin-note-header">
            <div class="margin-note-term">
              {{ activeGlossary.term }}
            </div>
            <div
              v-if="activeGlossary.pinned"
              i-solar:pin-bold
              class="margin-note-pin"
              role="button"
              tabindex="0"
              title="Unpin"
              @click="closeGlossary"
            />
          </div>
          <div class="margin-note-body" v-html="activeGlossary.definition" />
        </div>
      </Transition>

      <!-- Mobile: backdrop + bottom sheet -->
      <Transition name="glossary-backdrop">
        <div
          v-if="activeGlossary && isMobileGlossary"
          class="glossary-backdrop"
          @click="closeGlossary"
        />
      </Transition>
      <Transition name="glossary-sheet">
        <div
          v-if="activeGlossary && isMobileGlossary"
          class="glossary-sheet"
        >
          <div class="glossary-sheet-header">
            <div class="glossary-sheet-term">
              {{ activeGlossary.term }}
            </div>
            <button class="glossary-sheet-close" @click="closeGlossary">
              <div i-ri-close-line />
            </button>
          </div>
          <div class="glossary-sheet-body" v-html="activeGlossary.definition" />
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
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
          class="text-xs bg-zinc:15 text-[#91919b] rounded px-1 py-0.5 my-auto flex-none"
        >{{ ref.lang.toUpperCase() }}</span>
        <span v-if="ref.date" class="referenced-by-date">
          <span v-if="isDraftPost(ref.type)">🚧 </span>
          <span v-if="isRecentPost(ref.date, ref.updated) && !isDraftPost(ref.type)">🌱 </span>{{ formatDate(ref.date, false) }}
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
.backlinks-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem 0.6rem;
  margin-bottom: 0.6rem;
}
.backlink-header {
  display: flex;
  align-items: center;
}
.backlink-header + .backlink-header::before {
  content: '·';
  opacity: 0.3;
  margin-right: 0.6rem;
  font-size: 0.8rem;
}
.backlink-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 1rem;
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

.referenced-by {
  border-top: 1px solid rgba(125, 125, 125, 0.15);
  padding-top: 1rem;
}
.referenced-by-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 1rem;
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
  font-size: 1rem;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  text-decoration: none !important;
}
.referenced-by-link:hover {
  opacity: 1;
}
.referenced-by-date {
  font-size: 1rem;
  opacity: 0.45;
  white-space: nowrap;
}

/* ═══════════════════════════════════════════════
   DESKTOP MARGIN NOTE
   Fixed to right margin, mirrors ToC on left.
   ═══════════════════════════════════════════════ */

.margin-note {
  display: none;
  position: fixed;
  /* Mirror of ToC: right side, same width formula */
  right: 18px;
  width: calc(50vw - (var(--prose-max-width, 58ch) * 0.625) - 40px);
  min-width: 160px;
  max-width: 280px;
  font-size: 1em;
  line-height: 1.5;
  z-index: 200;
}

@media (min-width: 1024px) {
  .margin-note {
    display: block;
  }
}

@media (min-width: 1280px) {
  .margin-note {
    right: 28px;
    width: calc(50vw - (var(--prose-max-width, 58ch) * 0.625) - 50px);
  }
}

.margin-note-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5em;
  margin-bottom: 0.3em;
}

.margin-note-term {
  font-weight: 600;
  font-size: 0.85rem;
  color: #222;
  line-height: 1.3;
}

html.dark .margin-note-term {
  color: #ddd;
}

.margin-note-pin {
  font-size: 0.85rem;
  color: inherit;
  opacity: 0.3;
  flex-shrink: 0;
  margin-top: 0.05rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.margin-note-pin:hover {
  opacity: 1;
  color: #e35454;
}

.margin-note-pin:active {
  color: #222;
}

html.dark .margin-note-pin:hover {
  color: #fca5a5;
}

html.dark .margin-note-pin:active {
  color: #ddd;
}

.margin-note-body {
  font-size: 0.85rem;
  color: #555;
}

html.dark .margin-note-body {
  color: #bbb;
}

/* Inline elements inside the definition */
.margin-note-body :deep(a) {
  color: inherit;
  border-bottom: 1px solid rgba(125, 125, 125, 0.3);
  transition: border 0.3s ease-in-out;
}
.margin-note-body :deep(a:hover) {
  border-bottom-color: #555;
}
html.dark .margin-note-body :deep(a:hover) {
  border-bottom-color: #bbb;
}
.margin-note-body :deep(mark) {
  background: rgba(30, 30, 30, 0.88);
  color: #fff;
  border-radius: 0.15em;
  padding: 0.05em 0.25em;
  margin: 0 0.02em;
}
html.dark .margin-note-body :deep(mark) {
  background: rgba(235, 235, 235, 0.9);
  color: #111;
}
.margin-note-body :deep(code) {
  font-size: 0.92em;
  background-color: #aaaaaa18;
  border-radius: 0.25rem;
  padding: 0.2em 0.3em;
}

/* Margin note animation */
@keyframes marginNoteFadeIn {
  from {
    opacity: 0;
    transform: translateX(6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.margin-note-enter-active {
  animation: marginNoteFadeIn 0.15s ease;
}
.margin-note-leave-active {
  animation: marginNoteFadeIn 0.12s ease reverse;
}

/* ═══════════════════════════════════════════════
   MOBILE GLOSSARY BOTTOM SHEET
   ═══════════════════════════════════════════════ */

.glossary-backdrop {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgba(0, 0, 0, 0.4);
  -webkit-tap-highlight-color: transparent;
}

html.dark .glossary-backdrop {
  background: rgba(0, 0, 0, 0.6);
}

.glossary-backdrop-enter-active,
.glossary-backdrop-leave-active {
  transition: opacity 0.3s ease;
}
.glossary-backdrop-enter-from,
.glossary-backdrop-leave-to {
  opacity: 0;
}

.glossary-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 401;
  max-height: 50vh;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 1.25rem 1.25rem 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.1);
}

html.dark .glossary-sheet {
  background: rgba(20, 20, 20, 0.96);
  box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.4);
}

.glossary-sheet-enter-active,
.glossary-sheet-leave-active {
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
.glossary-sheet-enter-from,
.glossary-sheet-leave-to {
  transform: translateY(100%);
}

.glossary-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0;
  flex-shrink: 0;
}

.glossary-sheet-term {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: calc(100% - 3rem);
}

html.dark .glossary-sheet-term {
  color: rgba(255, 255, 255, 0.85);
}

.glossary-sheet-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.4);
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

html.dark .glossary-sheet-close {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.4);
}

.glossary-sheet-body {
  padding: 0.6rem 1.25rem 1.25rem;
  color: var(--fg, #555);
  line-height: 1.6;
  overflow-y: auto;
}

html.dark .glossary-sheet-body {
  color: var(--fg, #bbb);
}

/* Inherit inline styles in mobile sheet */
.glossary-sheet-body :deep(a) {
  border-bottom: 1px solid rgba(125, 125, 125, 0.3);
  transition: border 0.3s ease-in-out;
}
.glossary-sheet-body :deep(a:hover) {
  border-bottom-color: var(--fg);
}
.glossary-sheet-body :deep(mark) {
  background: rgba(30, 30, 30, 0.88);
  color: #fff;
  border-radius: 0.15em;
  padding: 0.05em 0.25em;
  margin: 0 0.02em;
}
html.dark .glossary-sheet-body :deep(mark) {
  background: rgba(235, 235, 235, 0.9);
  color: #111;
}
.glossary-sheet-body :deep(code) {
  font-size: 0.92em;
  background-color: #aaaaaa18;
  border-radius: 0.25rem;
  padding: 0.2em 0.3em;
}
</style>

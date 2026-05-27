<script setup lang='ts'>
import type { GlossaryState } from '~/logics/glossary'
import type { ArticleAudio } from '~/types'
import { useFluent } from 'fluent-vue'
import { formatDate, formatReadingDuration, isDraftPost, isRecentPost, resolvePath } from '~/logics'
import { useBacklink, useReferencedBy } from '~/logics/backlinks'
import { glossaryKey } from '~/logics/glossary'
import { getLocaleFromPath } from '~/logics/i18n-path'
import { artOverride } from '~/logics/keyboard-nav'
import '@shikijs/twoslash/style-rich.css'
import 'markdown-it-github-alerts/styles/github-base.css'
import 'markdown-it-github-alerts/styles/github-colors-dark-class.css'
import 'markdown-it-github-alerts/styles/github-colors-light.css'

const { frontmatter } = defineProps({
  frontmatter: {
    type: Object,
    required: true,
  },
})

const AsyncArticleAudio = defineAsyncComponent(() => import('~/components/ArticleAudio.vue'))

const fluent = useFluent()
const router = useRouter()
const route = useRoute()
const content = ref<HTMLDivElement>()
const marginNoteRef = ref<HTMLElement>()

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

  // Ensure note stays within viewport bounds
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

const pic = computed(() => {
  const p = frontmatter.pic
  if (!p || typeof p !== 'object' || !p.src)
    return undefined
  return {
    src: p.src as string,
    r: (p.r as string) || 'sm',
    link: (p.link as string) || undefined,
    text: (p.text as string) || undefined,
  }
})

const titleParts = computed(() => {
  const display = (frontmatter.display ?? frontmatter.title) as string
  if (!display)
    return null
  const p = pic.value
  if (!p?.text || !p.link)
    return { before: '', linked: '', after: display }
  const idx = display.indexOf(p.text)
  if (idx === -1)
    return { before: '', linked: '', after: display }
  return {
    before: display.slice(0, idx),
    linked: p.text,
    after: display.slice(idx + p.text.length),
  }
})

const localizedDuration = computed(() => {
  return formatReadingDuration(frontmatter.duration, currentLocale.value)
})

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : undefined
}

const articleAudio = computed<ArticleAudio | undefined>(() => {
  const audio = frontmatter.audio
  if (!audio || typeof audio !== 'object' || Array.isArray(audio))
    return undefined

  const record = audio as Record<string, unknown>
  const url = optionalString(record.url)
  if (!url)
    return undefined

  return {
    url,
    sourceTextUpdatedAt: optionalString(record.sourceTextUpdatedAt),
    duration: optionalString(record.duration),
    title: optionalString(record.title),
    artist: optionalString(record.artist),
    downloadUrl: optionalString(record.downloadUrl),
  }
})

const articleUpdatedAt = computed(() => {
  return optionalString(frontmatter.updated) || optionalString(frontmatter.date) || ''
})

const articleSlug = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  return parts[parts.length - 1] || optionalString(frontmatter.title) || 'article'
})

const articleImage = computed(() => {
  return optionalString(frontmatter.image)
})

/**
 * 'note' requires explicit type in frontmatter, 'blog' is the default.
 */
const postType = computed(() => {
  const type = frontmatter.type || 'blog'
  if (type.split('+').includes('note'))
    return 'note'
  return 'blog'
})

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

  // Intercept summary click to animate height via WAAPI. Native toggle is too abrupt.
  function animateSpoiler(details: HTMLDetailsElement) {
    const summary = details.querySelector<HTMLElement>('summary')
    const body = details.querySelector<HTMLElement>('.spoiler-content')
    if (!summary || !body)
      return

    let running: Animation | null = null

    summary.addEventListener('click', (e) => {
      e.preventDefault()

      if (running) {
        running.cancel()
        running = null
      }

      const isOpen = details.hasAttribute('open')

      if (!isOpen) {
        details.setAttribute('open', '')
        const h = body.scrollHeight
        running = body.animate(
          [
            { height: '0px', opacity: 0 },
            { height: `${h}px`, opacity: 1 },
          ],
          { duration: 280, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        )
        running.onfinish = () => {
          running = null
        }
      }
      else {
        const h = body.scrollHeight
        running = body.animate(
          [
            { height: `${h}px`, opacity: 1 },
            { height: '0px', opacity: 0 },
          ],
          { duration: 220, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
        )
        running.onfinish = () => {
          details.removeAttribute('open')
          running!.cancel()
          running = null
        }
      }
    })
  }

  const spoilers = content.value?.querySelectorAll<HTMLDetailsElement>('details.spoiler')
  spoilers?.forEach(animateSpoiler)

  useEventListener(content.value!, 'click', (e: MouseEvent) => {
    const backref = (e.target as HTMLElement).closest('a.source-backref')
    if (!backref)
      return

    e.preventDefault()
    const targetId = backref.getAttribute('href')?.slice(1)
    if (!targetId)
      return

    const target = document.getElementById(targetId)
    if (!target)
      return

    const y = target.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top: y, behavior: 'smooth' })

    target.classList.remove('source-highlight', 'source-highlight-fade')
    target.classList.add('source-highlight')
    requestAnimationFrame(() => {
      setTimeout(() => {
        target.classList.add('source-highlight-fade')
        target.addEventListener('transitionend', () => {
          target.classList.remove('source-highlight', 'source-highlight-fade')
        }, { once: true })
      }, 300)
    })
  }, { passive: false })

  useEventListener(content.value!, 'click', handleAnchors, { passive: false })

  // Heading copy-link
  const tooltipDefault = fluent.format('heading-link')
  const tooltipCopied = fluent.format('heading-copied')

  const headingSelector = 'h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'
  const headings = content.value!.querySelectorAll<HTMLElement>(headingSelector)
  headings.forEach((heading) => {
    heading.setAttribute('data-tooltip', tooltipDefault)
    heading.setAttribute('tabindex', '0')
    heading.setAttribute('aria-description', 'Press Enter to copy link')
  })

  function copyHeadingLink(heading: HTMLElement) {
    const url = `${location.origin}${location.pathname}#${heading.id}`
    navigator.clipboard.writeText(url).then(() => {
      heading.setAttribute('data-tooltip', tooltipCopied)
      setTimeout(() => {
        heading.setAttribute('data-tooltip', tooltipDefault)
      }, 2000)
    })
  }

  useEventListener(content.value!, 'click', (event: MouseEvent & { target: HTMLElement }) => {
    // Skip if clicking on the anchor # link itself — let handleAnchors deal with it
    if (event.target.closest('a.header-anchor'))
      return

    const heading = event.target.closest<HTMLElement>(headingSelector)
    if (!heading)
      return

    copyHeadingLink(heading)
  }, { passive: true })

  useEventListener(content.value!, 'keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ')
      return

    const heading = (event.target as HTMLElement).closest<HTMLElement>(headingSelector)
    if (!heading)
      return

    event.preventDefault()
    copyHeadingLink(heading)
  })

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

  checkMobileGlossary()
  useEventListener(window, 'resize', checkMobileGlossary)

  // Lock body scroll when mobile sheet is open
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
  <div :class="{ 'h-entry': frontmatter.date }">
    <div
      v-if="frontmatter.display ?? frontmatter.title"
      class="prose m-auto mb-8"
      :lang="currentLocale"
      :class="[frontmatter.wrapperClass, !frontmatter.date && pic ? 'h-card' : '']"
    >
      <div
        v-if="backlinks.length > 0"
        class="backlinks-container slide-enter-50"
      >
        <div v-for="backlink in backlinks" :key="backlink.path" class="backlink-header">
          <RouterLink :to="backlink.path" class="backlink-link">
            <div i-ri:corner-left-up-line class="backlink-icon" aria-hidden="true" />
            <span>
              <span v-if="isDraftPost(backlink.type)" role="img" aria-label="Draft">🚧 </span>{{ backlink.title }}
            </span>
            <span
              v-if="backlink.lang && backlink.lang !== currentLocale"
              class="text-xs bg-zinc:15 text-[#91919b] rounded px-1 py-0.5 my-auto flex-none"
            >{{ backlink.lang.toUpperCase() }}</span>
          </RouterLink>
        </div>
      </div>
      <h1 class="slide-enter-50 !mt-0 !mb-2.5 p-name" :lang="frontmatter.lang">
        <template v-if="pic && titleParts?.linked">
          <span v-if="titleParts.before" class="title-rest p-note">{{ titleParts.before }}</span><RouterLink
            :to="pic.link!"
            class="title-pic-link u-url"
          >
            <img
              :src="pic.src"
              alt=""
              class="title-pic u-photo"
              :class="`title-pic--${pic.r}`"
            ><span class="p-name">{{ titleParts.linked }}</span>
          </RouterLink><span class="title-rest p-note">{{ titleParts.after }}</span>
        </template>
        <template v-else>
          {{ frontmatter.display ?? frontmatter.title }}
        </template>
      </h1>
      <p
        v-if="frontmatter.date"
        class="slide-enter-50 !mt-0"
      >
        <span class="opacity-50">
          <span v-if="isDraftPost(frontmatter.type)" role="img" aria-label="Draft">🚧 </span>
          <span v-if="isRecentPost(frontmatter.date, frontmatter.updated) && !isDraftPost(frontmatter.type)" role="img" aria-label="Recent">🌱 </span><time class="dt-published" :datetime="new Date(frontmatter.date).toISOString()">{{ formatDate(frontmatter.date, false, currentLocale) }}</time><span v-if="frontmatter.updated"> · {{ $t('post-updated') }} {{ formatDate(frontmatter.updated, false, currentLocale) }}</span><span v-if="localizedDuration"> · {{ localizedDuration }}</span>
        </span>
      </p>
      <div v-if="frontmatter.date" class="p-author h-card" style="display: none;">
        <a class="u-url p-name" href="https://teslak.me">Teslak</a>
        <img class="u-photo" src="/avatar.avif" alt="Teslak">
      </div>
      <p v-if="frontmatter.place" class="mt--4!">
        <span op50>at </span>
        <a v-if="frontmatter.placeLink" :href="frontmatter.placeLink" target="_blank" rel="noopener noreferrer">
          {{ frontmatter.place }}
        </a>
        <span v-else font-bold>
          {{ frontmatter.place }}
        </span>
      </p>
      <p
        v-if="frontmatter.subtitle"
        class="opacity-50 !-mt-6 italic slide-enter"
        :lang="frontmatter.lang"
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
      <AsyncArticleAudio
        v-if="articleAudio"
        :audio="articleAudio"
        :article-title="frontmatter.display ?? frontmatter.title"
        :article-updated-at="articleUpdatedAt"
        :article-image="articleImage"
        :article-slug="articleSlug"
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
      :class="[frontmatter.tocAlwaysOn ? 'toc-always-on' : '', frontmatter.class, frontmatter.date ? 'e-content' : '']"
    >
      <slot />
    </article>

    <!-- Glossary -->
    <ClientOnly>
      <Teleport to="body">
        <!-- Margin note (mirrors ToC layout) -->
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

        <!-- Mobile bottom sheet -->
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
        <a v-if="frontmatter.telegram" :href="frontmatter.telegram" target="_blank" rel="noopener noreferrer" op50>{{ $t('post-link-telegram') }}</a>
        <span v-if="frontmatter.telegram && frontmatter.mastodon" op25> / </span>
        <a v-if="frontmatter.mastodon" :href="frontmatter.mastodon" target="_blank" rel="noopener noreferrer" op50>{{ $t('post-link-mastodon') }}</a>
      </template>

      <!-- Referenced By (articles that backlink to this one) -->
      <div v-if="referencedBy.length" class="referenced-by mt-9">
        <div class="referenced-by-label">
          <div i-ri:links-line class="referenced-by-label-icon" aria-hidden="true" />
          <span>{{ $t('post-referenced-by') }}</span>
        </div>
        <div v-for="ref in referencedBy" :key="ref.path" class="referenced-by-item">
          <RouterLink :to="ref.path" class="referenced-by-link">
            <div i-ri:corner-left-up-line class="backlink-icon" aria-hidden="true" />
            <span>{{ ref.title }}</span>
          </RouterLink>
          <span
            v-if="ref.lang && ref.lang !== currentLocale"
            class="text-xs bg-zinc:15 text-[#91919b] rounded px-1 py-0.5 my-auto flex-none"
          >{{ ref.lang.toUpperCase() }}</span>
          <span v-if="ref.date" class="referenced-by-date">
            <span v-if="isDraftPost(ref.type)" role="img" aria-label="Draft">🚧 </span>
            <span v-if="isRecentPost(ref.date, ref.updated) && !isDraftPost(ref.type)" role="img" aria-label="Recent">🌱 </span>{{ formatDate(ref.date, false, currentLocale) }}
          </span>
        </div>
      </div>

      <!-- Chronological navigation -->
      <PostNavigation
        v-if="frontmatter.date"
        :current-path="route.path"
        :type="postType"
        class="mt-9 mb-6"
      />

      <span font-mono op50>> </span>
      <RouterLink
        :to="backToAllPath"
        class="font-mono op50 hover:op75 transition-opacity duration-200"
        v-text="$t('action-back-to-all')"
      />
    </div>
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
  gap: 0.3rem;
  font-size: 1rem;
  opacity: 0.45;
  margin-bottom: 0.6rem;
}
.referenced-by-label-icon {
  font-size: 0.85rem;
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

@media (max-width: 640px) {
  .referenced-by-item {
    flex-wrap: wrap;
    gap: 0.15rem 0.5rem;
    margin-bottom: 1rem;
    align-items: flex-start;
  }
  .referenced-by-date {
    width: 100%;
    margin-top: 0.1rem;
    padding-left: 1.35rem;
    font-size: 0.9rem;
  }
}

/* Fixed margin note mirroring ToC position */

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

/* Mobile glossary bottom sheet */

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

article :deep(.sources-block) {
  background: rgba(125, 125, 125, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 0.5rem;
  margin: 2em 0 0;
  overflow: hidden;
  transition: border-radius 0.25s ease;
}

article :deep(.sources-block .spoiler-summary) {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.7em 1em;
  cursor: pointer;
  font-size: inherit;
  font-weight: 500;
  color: var(--fg-deep);
  user-select: none;
  list-style: none;
  transition: background 0.2s ease;
}

article :deep(.sources-block .spoiler-summary::-webkit-details-marker) {
  display: none;
}

article :deep(.sources-block .spoiler-summary:hover) {
  background: rgba(125, 125, 125, 0.08);
}

article :deep(.sources-block .spoiler-arrow) {
  font-size: 1.15em;
  opacity: 0.5;
  flex-shrink: 0;
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}

article :deep(.sources-block[open] > .spoiler-summary .spoiler-arrow) {
  transform: rotate(90deg);
  opacity: 0.8;
}

article :deep(.sources-block .spoiler-content) {
  padding: 0 1em 0.8em;
  font-size: inherit;
  color: var(--fg);
  overflow: hidden;
}

/* Custom list counters to override prose default styles */
article :deep(.sources-list) {
  margin: 0;
  padding-left: 0;
  list-style: none !important;
  counter-reset: source-counter;
}

article :deep(.source-item) {
  counter-increment: source-counter;
  display: flex;
  align-items: baseline;
  gap: 0.4em;
  padding: 0.15em 0;
  line-height: 1.5;
  font-size: 1rem;
}

article :deep(.source-item::before) {
  content: counter(source-counter) '.';
  opacity: 0.35;
  font-size: 0.85rem;
  flex-shrink: 0;
  min-width: 1.5em;
  text-align: right;
}

article :deep(.source-backrefs) {
  flex-shrink: 0;
  white-space: nowrap;
}

article :deep(.source-backref) {
  opacity: 0.3;
  font-size: 0.85rem;
  text-decoration: none !important;
  flex-shrink: 0;
  transition: opacity 0.2s ease;
  color: var(--fg);
}

article :deep(.source-backref:hover) {
  opacity: 0.7;
}

article :deep(.source-backref-orphan) {
  opacity: 0.15;
  cursor: default;
}

/* Match standard prose link styles */
article :deep(.source-title) {
  font-size: 1rem;
  word-break: break-word;
  color: inherit;
  border-bottom: 1px solid rgba(125, 125, 125, 0.3);
  transition: border 0.3s ease-in-out;
  text-decoration: none !important;
}

article :deep(.source-title:hover) {
  border-bottom-color: var(--fg);
}

article :deep(.source-domain) {
  opacity: 0.3;
  font-size: 1rem;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: auto;
}

/* Mobile sources adaptations */
@media (max-width: 640px) {
  article :deep(.source-domain) {
    display: none;
  }

  article :deep(.source-title) {
    border-bottom: none !important;
    text-decoration: underline;
    text-decoration-color: rgba(125, 125, 125, 0.3);
    text-underline-offset: 0.15em;
    text-decoration-thickness: 1px;
    transition: text-decoration-color 0.3s ease-in-out;
  }

  article :deep(.source-title:hover) {
    border-bottom: none !important;
    text-decoration-color: var(--fg);
  }

  article :deep(.source-backrefs) {
    display: inline-flex;
    gap: 0.3em;
  }
}

article :deep(.source-highlight) {
  background: rgba(50, 130, 255, 0.35);
  border-radius: 0.25em;
  box-shadow: 0 0 0 3px rgba(50, 130, 255, 0.35);
}

article :deep(.source-highlight-fade) {
  background: transparent;
  box-shadow: 0 0 0 3px transparent;
  transition:
    background 3s ease-out,
    box-shadow 3s ease-out;
}

/* Inline title pic (avatar / decorative image) */
.title-pic-link {
  text-decoration: none !important;
  border-bottom: none !important;
  color: inherit;
  cursor: pointer;
  --title-glint: #888;
  -webkit-text-fill-color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  background-image: linear-gradient(100deg, currentColor 40%, var(--title-glint) 50%, currentColor 60%);
  background-size: 400% 100%;
  background-position: -400% center;
  animation: title-glint 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
html.dark .title-pic-link {
  --title-glint: #aaa;
}
.title-pic-link:hover {
  animation: none;
  -webkit-text-fill-color: unset;
  -webkit-background-clip: unset;
  background-clip: unset;
  background-image: none;
}
@keyframes title-glint {
  0%,
  62.5% {
    background-position: -150% center;
  }
  100% {
    background-position: 150% center;
  }
}
.title-rest {
  transition: opacity 0.2s ease;
}
h1:has(.title-pic-link:hover) .title-rest {
  opacity: 0.7;
}
.title-pic-link:hover .title-pic {
  transform: scale(1.05);
}
.title-pic {
  display: inline;
  height: 1.2em;
  width: 1.2em;
  object-fit: cover;
  vertical-align: middle;
  margin: 0 0.15em 0 0 !important;
  position: relative;
  top: -0.05em;
  transition: transform 0.2s ease;
}
.title-pic--full {
  border-radius: 50%;
}
.title-pic--md {
  border-radius: 0.4em;
}
.title-pic--sm {
  border-radius: 0.2em;
}
</style>

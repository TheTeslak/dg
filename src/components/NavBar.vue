<script setup lang="ts">
import { useWindowScroll } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getCanonicalUrl } from '~/logics/site'

const route = useRoute()

const currentLocale = computed(() => {
  const pathLocale = route.path.split('/')[1]
  return ['en', 'ru', 'es'].includes(pathLocale) ? pathLocale : 'en'
})

function toTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

const { y: scroll } = useWindowScroll()

// Copy link logic
const copied = ref(false)
let copiedTimeout: ReturnType<typeof setTimeout> | undefined

const isPostPage = computed(() => {
  return /\/(?:articles|notes)\//.test(route.path)
})

async function copyLink() {
  const url = getCanonicalUrl(route.path)
  await navigator.clipboard.writeText(url)
  copied.value = true
  if (copiedTimeout)
    clearTimeout(copiedTimeout)
  copiedTimeout = setTimeout(() => {
    copied.value = false
  }, 2000)
}

onBeforeUnmount(() => {
  if (copiedTimeout)
    clearTimeout(copiedTimeout)
})
</script>

<template>
  <header class="header z-40">
    <RouterLink
      class="w-12 h-12 absolute lg:fixed m-5 select-none outline-none"
      :to="`/${currentLocale}`"
      focusable="false"
    >
      <Logo />
    </RouterLink>
    <!-- Fixed bottom-right action buttons (desktop) -->
    <div
      class="fixed right-3 bottom-3 z-100 flex items-center gap-2 transition duration-300 print:hidden"
      :class="scroll > 300 ? 'op30 hover:op100' : 'op0! pointer-events-none'"
    >
      <!-- Copy Link button (only on post pages) -->
      <button
        v-if="isPostPage"
        class="flex items-center justify-center min-w-10 h-10 hover-bg-hex-8883 rounded-full transition-all duration-300 overflow-hidden"
        :class="copied ? 'pl-3 pr-4' : 'px-0'"
        :title="copied ? $t('post-link-copied') : $t('post-copy-link')"
        @click="copyLink()"
      >
        <div :class="copied ? 'i-ri-check-line' : 'i-ri-links-line'" class="shrink-0" />
        <span
          class="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300"
          :class="copied ? 'ml-2 max-w-40 opacity-100' : 'ml-0 max-w-0 opacity-0'"
        >
          {{ $t('post-link-copied') }}
        </span>
      </button>

      <!-- Scroll to top -->
      <button
        class="flex items-center justify-center w-10 h-10 hover-bg-hex-8883 rounded-full transition duration-300"
        :title="$t('action-to-top')"
        @click="toTop()"
      >
        <div i-ri-arrow-up-line />
      </button>
    </div>
    <nav class="nav">
      <div class="spacer" />
      <div class="right" print:op0>
        <RouterLink :to="`/${currentLocale}/notes`" :title="$t('nav-blog')">
          <span class="lt-md:hidden">{{ $t('nav-blog') }}</span>
          <div i-ri-article-line md:hidden />
        </RouterLink>
        <RouterLink :to="`/${currentLocale}/projects`" :title="$t('nav-projects')">
          <span class="lt-md:hidden">{{ $t('nav-projects') }}</span>
          <div i-ri-lightbulb-line class="md:hidden" />
        </RouterLink>
        <RouterLink :to="`/${currentLocale}/photos`" :title="$t('nav-photos')" class="lt-md:hidden">
          {{ $t('nav-photos') }}
        </RouterLink>
        <!-- hidden nav items (kept for future use) -->
        <RouterLink v-if="false" :to="`/${currentLocale}/talks`" class="lt-md:hidden" :title="$t('nav-talks')">
          {{ $t('nav-talks') }}
        </RouterLink>
        <RouterLink v-if="false" :to="`/${currentLocale}/sponsors-list`" :title="$t('nav-sponsors')">
          <span class="lt-md:hidden">{{ $t('nav-sponsors') }}</span>
          <div i-ri-heart-line class="md:hidden" />
        </RouterLink>
        <RouterLink v-if="false" :to="`/${currentLocale}/podcasts`" class="lt-md:hidden" :title="$t('nav-podcasts')">
          <div i-ri-mic-line />
        </RouterLink>
        <RouterLink v-if="false" :to="`/${currentLocale}/demos`" :title="$t('nav-demos')">
          <div i-ri-screenshot-line />
        </RouterLink>

        <a href="https://t.me/" target="_blank" title="Telegram" class="lt-md:hidden">
          <div i-ri-telegram-2-line class="scale-110" />
        </a>
        <a v-if="false" href="https://github.com/antfu" target="_blank" title="GitHub" class="lt-md:hidden">
          <div i-uil-github-alt />
        </a>
        <a :href="currentLocale === 'en' ? '/feed.xml' : `/feed-${currentLocale}.xml`" target="_blank" title="RSS" class="lt-md:hidden">
          <div i-ri-rss-line />
        </a>

        <ToggleTheme />
        <LanguageSelector />
      </div>
    </nav>
  </header>
</template>

<style scoped>
.header h1 {
  margin-bottom: 0;
}

.logo {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
}

.nav {
  padding: 2rem;
  width: 100%;
  display: grid;
  grid-template-columns: auto max-content;
  box-sizing: border-box;
}

.nav > * {
  margin: auto;
}

.nav img {
  margin-bottom: 0;
}

.nav a {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s ease;
  opacity: 0.6;
  outline: none;
}

.nav a:hover {
  opacity: 1;
  text-decoration-color: inherit;
}

.nav .right {
  display: grid;
  grid-gap: 1.2rem;
  grid-auto-flow: column;
}

.nav .right > * {
  margin: auto;
}

/* Hide desktop fixed actions on mobile — mobile action bar takes over */
@media (max-width: 1023px) {
  .fixed.right-3.bottom-3 {
    display: none !important;
  }
}
</style>

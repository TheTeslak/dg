<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWindowScroll } from '@vueuse/core'

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
</script>

<template>
  <header class="header z-40">
    <RouterLink
      class="w-12 h-12 absolute xl:fixed m-5 select-none outline-none"
      :to="`/${currentLocale}`"
      focusable="false"
    >
      <Logo />
    </RouterLink>
    <button
      :title="$t('action-to-top')"
      fixed right-3 bottom-3 w-10 h-10 hover:op100 rounded-full
      hover-bg-hex-8883 transition duration-300 z-100 print:hidden
      :class="scroll > 300 ? 'op30' : 'op0! pointer-events-none'"
      @click="toTop()"
    >
      <div i-ri-arrow-up-line />
    </button>
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
          <div i-ri-telegram-line />
        </a>
        <a v-if="false" href="https://github.com/antfu" target="_blank" title="GitHub" class="lt-md:hidden">
          <div i-uil-github-alt />
        </a>
        <a :href="currentLocale === 'en' ? '/feed.xml' : `/feed-${currentLocale}.xml`" target="_blank" title="RSS" class="lt-md:hidden">
          <div i-la-rss-square style="font-size:1.25rem; margin: 0 -0.125rem;" />
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
</style>
<script setup lang="ts">
import { useScrollLock, useWindowScroll } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getLocaleFromPath } from '~/logics/i18n-path'
import { getCanonicalUrl } from '~/logics/site'

const route = useRoute()

const currentLocale = computed(() => getLocaleFromPath(route.path))

function localePath(path = '') {
  return {
    path: `/${currentLocale.value}${path}`,
    query: route.query,
    hash: route.hash,
  }
}

function toTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

const { y: scroll } = useWindowScroll()

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

const mobileMenuOpen = ref(false)
const scrollLock = useScrollLock(typeof document !== 'undefined' ? document.body : null)

watch(mobileMenuOpen, (open) => {
  scrollLock.value = open
})

watch(() => route.path, () => {
  mobileMenuOpen.value = false
})

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

onBeforeUnmount(() => {
  if (copiedTimeout)
    clearTimeout(copiedTimeout)
  scrollLock.value = false
})
</script>

<template>
  <header class="header z-40">
    <RouterLink
      class="w-12 h-12 absolute lg:fixed m-5 select-none outline-none"
      :to="localePath()"
      aria-label="Home"
    >
      <Logo />
    </RouterLink>

    <button
      class="mobile-menu-btn md:hidden"
      @click="toggleMobileMenu"
    >
      {{ mobileMenuOpen ? $t('nav-close') : $t('nav-menu') }}
    </button>
    <!-- Desktop action buttons -->
    <div
      class="fixed right-3 bottom-3 z-100 flex items-center gap-2 transition duration-300 print:hidden"
      :class="scroll > 300 ? 'op75 hover:op100' : 'op0! pointer-events-none'"
    >
      <!-- Post link copy -->
      <button
        v-if="isPostPage"
        class="flex items-center justify-center min-w-10 h-10 bg-base hover:bg-[#e7e7e7] dark:hover:bg-[#1b1b1b] rounded-full transition-all duration-300 overflow-hidden"
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

      <!-- Scroll top -->
      <button
        class="flex items-center justify-center w-10 h-10 bg-base hover:bg-[#e7e7e7] dark:hover:bg-[#1b1b1b] rounded-full transition duration-300"
        :title="$t('action-to-top')"
        :aria-label="$t('action-to-top')"
        @click="toTop()"
      >
        <div i-ri-arrow-up-line />
      </button>
    </div>
    <nav class="nav" role="navigation" aria-label="Main Navigation">
      <div class="spacer" />
      <div class="right" print:op0>
        <RouterLink :to="localePath('/notes')" :title="$t('nav-blog')" class="lt-md:hidden">
          <span>{{ $t('nav-blog') }}</span>
        </RouterLink>
        <RouterLink :to="localePath('/now')" :title="$t('nav-now')" class="lt-md:hidden">
          {{ $t('nav-now') }}
        </RouterLink>
        <RouterLink :to="localePath('/projects')" :title="$t('nav-projects')" class="lt-md:hidden">
          <span>{{ $t('nav-projects') }}</span>
        </RouterLink>
        <RouterLink :to="localePath('/photos')" :title="$t('nav-photos')" class="lt-md:hidden">
          {{ $t('nav-photos') }}
        </RouterLink>

        <a href="https://t.me/" target="_blank" title="Telegram" class="lt-md:hidden">
          <div i-ri-telegram-2-line class="scale-110" />
        </a>
        <a :href="currentLocale === 'en' ? '/feed.xml' : `/feed-${currentLocale}.xml`" target="_blank" title="RSS" class="lt-md:hidden">
          <div i-ri-rss-line />
        </a>

        <ToggleTheme class="lt-md:hidden" />
        <LanguageSelector class="lt-md:hidden" />
      </div>
    </nav>

    <Teleport to="body">
      <Transition name="mobile-menu">
        <div
          v-if="mobileMenuOpen"
          class="mobile-menu-overlay"
          @click.self="closeMobileMenu"
        >
          <div class="mobile-menu-panel" @click.stop>
            <nav class="mobile-menu-links">
              <RouterLink :to="localePath()" @click="closeMobileMenu">
                Teslak.Me
              </RouterLink>
              <RouterLink :to="localePath('/notes')" @click="closeMobileMenu">
                {{ $t('nav-blog') }}
              </RouterLink>
              <RouterLink :to="localePath('/now')" @click="closeMobileMenu">
                {{ $t('nav-now') }}
              </RouterLink>
              <RouterLink :to="localePath('/projects')" @click="closeMobileMenu">
                {{ $t('nav-projects') }}
              </RouterLink>
              <RouterLink :to="localePath('/photos')" @click="closeMobileMenu">
                {{ $t('nav-photos') }}
              </RouterLink>
            </nav>
            <div class="mobile-menu-icons">
              <a href="https://t.me/" target="_blank" title="Telegram">
                <div i-ri-telegram-2-line class="scale-110" />
              </a>
              <a :href="currentLocale === 'en' ? '/feed.xml' : `/feed-${currentLocale}.xml`" target="_blank" title="RSS">
                <div i-ri-rss-line />
              </a>
              <ToggleTheme />
              <LanguageSelector />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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

.nav a,
.nav button {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s ease;
  opacity: 0.75;
  outline: none;
}

.nav a:focus-visible,
.nav button:focus-visible {
  outline: 2px solid rgba(125, 125, 125, 0.4);
  outline-offset: 4px;
}

.nav a:hover,
.nav button:hover {
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

/* Mobile navigation overrides */
@media (max-width: 1023px) {
  .fixed.right-3.bottom-3 {
    display: none !important;
  }
}

.mobile-menu-btn {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  height: 3rem;
  padding: 0 1.25rem;
  border: 0;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(125, 125, 125, 0.11);
  transition:
    background 200ms ease,
    transform 180ms ease;
  z-index: 201;
}

@media (min-width: 768px) {
  .mobile-menu-btn {
    display: none !important;
  }
}

.mobile-menu-btn:hover {
  background: rgba(125, 125, 125, 0.18);
  transform: scale(1.07);
}

.mobile-menu-btn:active {
  background: rgba(125, 125, 125, 0.18);
  transform: scale(0.93);
  transition-duration: 80ms;
}

.mobile-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
}

.mobile-menu-panel {
  background: var(--c-bg);
  border-bottom: 1px solid rgba(125, 125, 125, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  padding: 1.5rem 2.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dark .mobile-menu-panel {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.mobile-menu-links {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.mobile-menu-links a {
  display: block;
  padding: 0.55rem 0;
  font-size: 1.15rem;
  font-weight: 500;
  color: inherit;
  text-decoration: none;
  opacity: 0.7;
  transition: opacity 200ms ease;
}

.mobile-menu-links a:hover,
.mobile-menu-links a.router-link-active {
  opacity: 1;
}

.mobile-menu-icons {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(125, 125, 125, 0.12);
}

.mobile-menu-icons a,
.mobile-menu-icons button,
.mobile-menu-icons :deep(button) {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  opacity: 0.55;
  transition: opacity 200ms ease;
  background: none;
  border: none;
  padding: 0.3rem;
  font-size: 1.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mobile-menu-icons a:hover,
.mobile-menu-icons button:hover,
.mobile-menu-icons :deep(button:hover) {
  opacity: 1;
}

.mobile-menu-enter-active .mobile-menu-panel {
  transition:
    transform 280ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 200ms ease;
}

.mobile-menu-leave-active .mobile-menu-panel {
  transition:
    transform 220ms cubic-bezier(0.4, 0, 1, 1),
    opacity 180ms ease;
}

.mobile-menu-enter-from .mobile-menu-panel,
.mobile-menu-leave-to .mobile-menu-panel {
  transform: translateY(-100%);
  opacity: 0;
}

.mobile-menu-enter-active {
  transition: background-color 280ms ease;
}

.mobile-menu-leave-active {
  transition: background-color 220ms ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  background-color: transparent;
}

@media (prefers-reduced-motion: reduce) {
  .mobile-menu-enter-active,
  .mobile-menu-leave-active,
  .mobile-menu-enter-active .mobile-menu-panel,
  .mobile-menu-leave-active .mobile-menu-panel {
    transition: none;
  }
}
</style>

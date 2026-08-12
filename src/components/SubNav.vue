<script setup lang="ts">
import { onKeyStroke, useEventListener } from '@vueuse/core'
import { useFluent } from 'fluent-vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getLocaleFromPath } from '~/logics/i18n-path'
import { isEditableTarget } from '~/logics/keyboard-nav'
import { useSearch } from '~/logics/search'
import { onlyLanguage } from '../logics'

const inactiveStyle = 'opacity-30 hover:opacity-60 transition-opacity duration-200'
const activeStyle = 'opacity-100 underline'

const fluent = useFluent()
const route = useRoute()

const currentLocale = computed(() => {
  return getLocaleFromPath(route.path)
})

const routePostTypes = computed(() => {
  return String(route.meta.frontmatter?.type || 'blog').split('+')
})

const isNotesActive = computed(() => {
  return route.path.includes('/notes')
    || (route.meta.isArticle === true && routePostTypes.value.includes('note'))
})

const isArticlesActive = computed(() => {
  return route.path.includes('/articles')
    || (route.meta.isArticle === true && !routePostTypes.value.includes('note'))
})

const isFindsActive = computed(() => {
  return route.meta.isFind === true || route.path.includes('/finds')
})

const showLanguageFilter = computed(() => !isFindsActive.value)

const { isSearchOpen, searchQuery, openSearch, closeSearch } = useSearch(currentLocale)
const isLanguageFilterInteractive = computed(() => showLanguageFilter.value && !isSearchOpen.value)

const searchInputRef = ref<HTMLInputElement>()
const tabsScrollRef = ref<HTMLElement>()
const isTabsScrolledStart = ref(true)
const isTabsScrolledEnd = ref(true)

function onTabsScroll(e: Event) {
  const el = e.target as HTMLElement
  isTabsScrolledStart.value = el.scrollLeft <= 1
  isTabsScrolledEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
}

function checkTabsOverflow() {
  const el = tabsScrollRef.value
  if (!el)
    return
  isTabsScrolledStart.value = el.scrollLeft <= 1
  // No gradient needed when content fits without scrolling
  isTabsScrolledEnd.value = el.scrollWidth <= el.clientWidth
    || el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
}

if (typeof window !== 'undefined') {
  useEventListener(window, 'resize', checkTabsOverflow)
}

onMounted(() => nextTick(checkTabsOverflow))

watch(isSearchOpen, async (open) => {
  if (open) {
    await nextTick()
    searchInputRef.value?.focus()
  }
  else {
    await nextTick()
    checkTabsOverflow()
  }
})

function handleSearchClick() {
  if (isSearchOpen.value)
    closeSearch()
  else
    openSearch()
}

// Cmd+K / Ctrl+K hotkey
onKeyStroke('k', (e) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    handleSearchClick()
  }
})

// Escape to close
onKeyStroke('Escape', () => {
  if (isSearchOpen.value)
    closeSearch()
})

// Type-to-search: open search panel when user types any printable character
useEventListener(typeof document !== 'undefined' ? document : null, 'keydown', (e: KeyboardEvent) => {
  // Skip modifier combos (Ctrl+C, Cmd+V, etc.)
  if (e.ctrlKey || e.metaKey || e.altKey)
    return
  // Only react to single printable characters (letters, digits, punctuation)
  if (e.key.length !== 1)
    return
  // Don't intercept if user is already typing somewhere
  if (isEditableTarget(e.target))
    return

  if (!isSearchOpen.value) {
    // Open search and seed the query with the typed character
    e.preventDefault()
    searchQuery.value = e.key
    openSearch()
  }
  else if (searchInputRef.value && document.activeElement !== searchInputRef.value) {
    // Search is open but input hasn't focused yet (fast typing edge case)
    e.preventDefault()
    searchQuery.value += e.key
  }
})

const modKey = computed(() => {
  if (typeof globalThis.navigator !== 'undefined')
    return globalThis.navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'
  return 'Ctrl'
})
</script>

<template>
  <div class="prose m-auto mb-8 select-none animate-none! op100!">
    <button
      flex="~ gap1" items-center mb2 text-sm
      class="language-filter op60 hover:op100 focus-visible:op100 active:op80 transition-opacity outline-none rounded-sm"
      :class="{ 'invisible pointer-events-none': !isLanguageFilterInteractive }"
      :disabled="!isLanguageFilterInteractive"
      :aria-hidden="!isLanguageFilterInteractive"
      :tabindex="isLanguageFilterInteractive ? 0 : -1"
      @click="onlyLanguage = !onlyLanguage"
    >
      <div :class="onlyLanguage ? 'i-carbon-checkbox-checked' : 'i-carbon-checkbox'" />
      {{ $t('blog-only-lang', { lang: currentLocale.toUpperCase() }) }}
    </button>

    <div mb-0 flex="~ items-center gap-4 sm:gap-6" text-3xl>
      <!-- Tabs (hidden when search is open) -->
      <template v-if="!isSearchOpen">
        <div class="subnav-scroll-area" :class="{ 'scrolled-start': isTabsScrolledStart, 'scrolled-end': isTabsScrolledEnd }">
          <div ref="tabsScrollRef" class="subnav-tabs" @scroll.passive="onTabsScroll">
            <RouterLink :to="`/${currentLocale}/notes`" class="!border-none" :class="isNotesActive ? activeStyle : inactiveStyle">
              {{ $t('nav-notes') }}
            </RouterLink>
            <RouterLink :to="`/${currentLocale}/articles`" class="!border-none" :class="isArticlesActive ? activeStyle : inactiveStyle">
              {{ $t('nav-articles') }}
            </RouterLink>
            <RouterLink :to="`/${currentLocale}/finds`" class="!border-none" :class="isFindsActive ? activeStyle : inactiveStyle">
              {{ $t('nav-finds') }}
            </RouterLink>
          </div>
        </div>
        <button
          class="search-trigger"
          :title="`${fluent.format('search-placeholder')} (${modKey}+K)`"
          :aria-label="fluent.format('search-placeholder')"
          @click="openSearch"
        >
          <div i-ri:search-line />
        </button>
      </template>

      <!-- Search input (shown when search is open) -->
      <div v-else class="search-input-container">
        <div class="search-input-icon" i-ri:search-line />
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="fluent.format('search-placeholder')"
          :aria-label="fluent.format('search-placeholder')"
        >
        <button
          class="search-close-btn"
          :title="fluent.format('search-close')"
          :aria-label="fluent.format('search-close')"
          @click="closeSearch"
        >
          <div i-ri:close-line />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.subnav-scroll-area {
  flex: 1;
  min-width: 0;
}

.subnav-tabs {
  display: flex;
  flex-flow: row nowrap;
  align-items: baseline;
  gap: 1.125rem;
}

.subnav-tabs a {
  white-space: nowrap;
}

@media (max-width: 639px) {
  .subnav-scroll-area {
    position: relative;
  }

  .subnav-scroll-area::before,
  .subnav-scroll-area::after {
    content: '';
    position: absolute;
    top: 0;
    width: 2.5rem;
    height: 100%;
    pointer-events: none;
    opacity: 1;
    transition: opacity 0.2s ease;
    z-index: 2;
  }

  /* Left gradient (fade on overflow) */
  .subnav-scroll-area::before {
    left: 0;
    background: linear-gradient(to right, var(--c-bg), transparent);
  }

  /* Right gradient (fade on overflow) */
  .subnav-scroll-area::after {
    right: 0;
    background: linear-gradient(to right, transparent, var(--c-bg));
  }

  .subnav-scroll-area.scrolled-start::before {
    opacity: 0;
  }

  .subnav-scroll-area.scrolled-end::after {
    opacity: 0;
  }

  .subnav-tabs {
    gap: 0.75rem;
    overflow-x: auto;
    scrollbar-width: none; /* Firefox */
    -webkit-overflow-scrolling: touch;
  }

  .subnav-tabs::-webkit-scrollbar {
    display: none; /* Chrome / Safari */
  }
}

@media (max-width: 767px) {
  .language-filter {
    gap: 0.5rem;
  }
}

.search-trigger {
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.2s ease;
  font-size: 1.1rem;
  flex-shrink: 0;
  padding: 0.25rem;
  border: none;
  background: none;
  color: inherit;
}
.search-trigger:hover {
  opacity: 0.7;
}

.search-trigger:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.search-input-container {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  border: 1px solid rgba(125, 125, 125, 0.45);
  border-radius: 0.5rem;
  padding: 0.45rem 0.75rem;
  font-size: 1.1rem;
  transition: border-color 0.2s ease;
  animation: search-expand 0.25s ease both;
}

.search-input-container:focus-within {
  border-color: rgba(125, 125, 125, 0.75);
}

.search-input-icon {
  opacity: 0.55;
  flex-shrink: 0;
  font-size: 1rem;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: 1.1rem;
  color: inherit;
  min-width: 0;
  font-family: inherit;
}

.search-input::placeholder {
  opacity: 0.55;
}

.search-close-btn {
  cursor: pointer;
  opacity: 0.45;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
  padding: 0.15rem;
  border: none;
  background: none;
  color: inherit;
  font-size: 1rem;
}
.search-close-btn:hover {
  opacity: 1;
}

.search-close-btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

@keyframes search-expand {
  from {
    opacity: 0;
    transform: scaleX(0.85);
    transform-origin: right center;
  }
  to {
    opacity: 1;
    transform: scaleX(1);
    transform-origin: right center;
  }
}

.dark .search-input-container {
  border-color: rgba(125, 125, 125, 0.6);
}
.dark .search-input-container:focus-within {
  border-color: rgba(125, 125, 125, 0.9);
}
</style>

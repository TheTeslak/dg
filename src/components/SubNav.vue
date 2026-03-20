<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { useFluent } from 'fluent-vue'
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getLocaleFromPath } from '~/logics/i18n-path'
import { useSearch } from '~/logics/search'
import { onlyLanguage } from '../logics'

const inactiveStyle = 'opacity-20 hover:opacity-50'
const activeStyle = 'opacity-100 underline'

const fluent = useFluent()
const route = useRoute()

const currentLocale = computed(() => {
  return getLocaleFromPath(route.path)
})

const { isSearchOpen, searchQuery, openSearch, closeSearch } = useSearch(currentLocale)

const searchInputRef = ref<HTMLInputElement>()

watch(isSearchOpen, async (open) => {
  if (open) {
    await nextTick()
    searchInputRef.value?.focus()
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

const modKey = computed(() => {
  if (typeof globalThis.navigator !== 'undefined')
    return globalThis.navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'
  return 'Ctrl'
})
</script>

<template>
  <div class="prose m-auto mb-8 select-none animate-none! op100!">
    <button
      v-show="!isSearchOpen"
      flex="~ gap1" items-center mb2 op30 text-sm
      @click="onlyLanguage = !onlyLanguage"
    >
      <div :class="onlyLanguage ? 'i-carbon-checkbox-checked' : 'i-carbon-checkbox'" />
      {{ $t('blog-only-lang', { lang: currentLocale.toUpperCase() }) }}
    </button>

    <div mb-0 flex="~ items-center gap-1 sm:gap-3" text-3xl>
      <!-- Tabs (hidden when search is open) -->
      <template v-if="!isSearchOpen">
        <div flex="~ col gap-1 sm:row sm:gap-3 wrap" class="subnav-tabs">
          <RouterLink :to="`/${currentLocale}/notes`" class="!border-none" :class="route.path.includes('/notes') ? activeStyle : inactiveStyle">
            {{ $t('nav-notes') }}
          </RouterLink>
          <RouterLink :to="`/${currentLocale}/articles`" class="!border-none" :class="route.path.includes('/articles') ? activeStyle : inactiveStyle">
            {{ $t('nav-articles') }}
          </RouterLink>
          <!-- hidden tabs -->
          <RouterLink v-if="false" :to="`/${currentLocale}/talks`" class="!border-none" :class="route.path.includes('/talks') ? activeStyle : inactiveStyle">
            {{ $t('nav-talks') }}
          </RouterLink>
          <RouterLink v-if="false" :to="`/${currentLocale}/podcasts`" class="!border-none" :class="route.path.includes('/podcasts') ? activeStyle : inactiveStyle">
            {{ $t('nav-podcasts') }}
          </RouterLink>
          <RouterLink v-if="false" :to="`/${currentLocale}/streams`" class="!border-none" :class="route.path.includes('/streams') ? activeStyle : inactiveStyle">
            {{ $t('nav-streams') }}
          </RouterLink>
        </div>
        <div class="flex-1" />
        <button
          class="search-trigger"
          :title="`${fluent.format('search-placeholder')} (${modKey}+K)`"
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
        >
        <button
          class="search-close-btn"
          :title="fluent.format('search-close')"
          @click="closeSearch"
        >
          <div i-ri:close-line />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.subnav-tabs {
  flex: 1;
  min-width: 0;
}

.search-trigger {
  cursor: pointer;
  opacity: 0.25;
  transition: opacity 0.2s ease;
  font-size: 1.1rem;
  flex-shrink: 0;
  padding: 0.25rem;
  border: none;
  background: none;
  color: inherit;
}
.search-trigger:hover {
  opacity: 0.6;
}

.search-input-container {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  border: 1px solid rgba(125, 125, 125, 0.3);
  border-radius: 0.5rem;
  padding: 0.45rem 0.75rem;
  font-size: 1.1rem;
  transition: border-color 0.2s ease;
  animation: search-expand 0.25s ease both;
}

.search-input-container:focus-within {
  border-color: rgba(125, 125, 125, 0.5);
}

.search-input-icon {
  opacity: 0.35;
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
  opacity: 0.35;
}

.search-close-btn {
  cursor: pointer;
  opacity: 0.3;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
  padding: 0.15rem;
  border: none;
  background: none;
  color: inherit;
  font-size: 1rem;
}
.search-close-btn:hover {
  opacity: 0.7;
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
  border-color: rgba(125, 125, 125, 0.4);
}
.dark .search-input-container:focus-within {
  border-color: rgba(125, 125, 125, 0.6);
}
</style>

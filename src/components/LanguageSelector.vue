<script setup lang="ts">
import { onClickOutside, useEventListener } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { localeConfig } from '~/locales/config'
import { getLocaleFromPath, isSupportedLocale, setPathLocale, supportedLocales } from '~/logics/i18n-path'
import { setLocaleCookie } from '~/logics/locale-cookie'

const router = useRouter()
const route = useRoute()

const currentLocale = computed(() => getLocaleFromPath(route.path))
const availableLocales = supportedLocales

const open = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

// Sliding hover highlight logic
const highlightTop = ref(0)
const highlightHeight = ref(0)
const highlightIndex = ref<number | null>(null)

function setHighlight(index: number, event: MouseEvent | FocusEvent) {
  const target = event.currentTarget as HTMLElement
  if (target) {
    highlightTop.value = target.offsetTop
    highlightHeight.value = target.offsetHeight
    highlightIndex.value = index
  }
}

function clearHighlight() {
  highlightIndex.value = null
}

const highlightStyle = computed(() => ({
  transform: `translateY(${highlightTop.value}px)`,
  height: `${highlightHeight.value}px`,
}))

function toggle() {
  open.value = !open.value
  if (!open.value)
    clearHighlight()
}

function close() {
  open.value = false
  clearHighlight()
}

onClickOutside(dropdownRef, close)
useEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape')
    close()
})

async function changeLang(lang: string) {
  if (!isSupportedLocale(lang))
    return

  close()
  setLocaleCookie(lang)

  const newPath = setPathLocale(route.path, lang)
  const target = {
    path: newPath,
    query: route.query,
    hash: route.hash,
  }

  if (newPath === route.path)
    return

  await router.push(target)

  // Alias route identity must not prevent the user's explicit site-locale choice.
  if (route.path !== newPath && typeof window !== 'undefined') {
    const href = router.resolve(target).href
    window.location.assign(href)
  }
}
</script>

<template>
  <div ref="dropdownRef" class="lang-selector">
    <button
      :title="$t('action-change-language')"
      :aria-label="$t('action-change-language')"
      class="lang-toggle"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="lang-code">{{ currentLocale.toUpperCase() }}</span>
      <svg class="lang-chevron" :class="{ 'lang-chevron-open': open }" width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <Transition name="lang-dropdown">
      <div v-if="open" class="lang-dropdown" role="menu" @mouseleave="clearHighlight">
        <!-- Floating highlight backdrop -->
        <div
          class="lang-hover-bg"
          :class="{ 'lang-hover-bg-visible': highlightIndex !== null }"
          :style="highlightStyle"
        />

        <button
          v-for="(lang, index) in availableLocales"
          :key="lang"
          role="menuitem"
          class="lang-option"
          :class="{ 'lang-option-active': currentLocale === lang }"
          @mouseenter="setHighlight(index, $event)"
          @focus="setHighlight(index, $event)"
          @click="changeLang(lang)"
        >
          <span class="lang-option-name">{{ localeConfig[lang].nativeName }}</span>
          <span class="lang-option-code">{{ lang.toUpperCase() }}</span>
        </button>

        <hr class="lang-divider">

        <RouterLink
          :to="{ path: `/${currentLocale}/no-single-language`, hash: '#методология-перевода', query: route.query }"
          role="menuitem"
          class="lang-option"
          @mouseenter="setHighlight(availableLocales.length, $event)"
          @focus="setHighlight(availableLocales.length, $event)"
          @click="close"
        >
          <span class="lang-option-name">{{ $t('nav-methodology') }}</span>
          <div class="i-ri-question-line lang-option-icon" />
        </RouterLink>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.lang-selector {
  position: relative;
}

.lang-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.25rem 0.5rem;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.03em;
  opacity: 0.75;
  transition: opacity 0.2s ease;
  outline: none;
  border-radius: 6px;
  user-select: none;
}

.lang-toggle:hover {
  opacity: 1;
}

.lang-toggle:focus-visible {
  outline: 2px solid rgba(125, 125, 125, 0.4);
  outline-offset: 2px;
}

.lang-chevron {
  transition: transform 0.2s ease;
}

.lang-chevron-open {
  transform: rotate(180deg);
}

.lang-dropdown {
  position: absolute;
  top: calc(100% + 0.375rem);
  right: 0;
  min-width: 8.5rem;
  padding: 0.25rem;
  background: var(--c-bg);
  border: 1px solid rgba(125, 125, 125, 0.15);
  border-radius: 12px;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.1);
  z-index: 100;
  display: flex;
  flex-direction: column;
}

html.dark .lang-dropdown {
  border-color: rgba(125, 125, 125, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
}

/* Sliding hover background */
.lang-hover-bg {
  position: absolute;
  left: 0.25rem;
  right: 0.25rem;
  top: 0;
  background: rgba(125, 125, 125, 0.09);
  border-radius: 8px;
  pointer-events: none;
  opacity: 0;
  transition:
    opacity 0.12s ease,
    transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
    height 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

html.dark .lang-hover-bg {
  background: rgba(125, 125, 125, 0.14);
}

.lang-hover-bg-visible {
  opacity: 1;
}

.lang-option {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.875rem;
  text-align: left;
  border-radius: 8px;
  outline: none;
  opacity: 0.65;
  transition: opacity 0.15s ease;
  z-index: 1;
  text-decoration: none;
}

.lang-option:hover {
  opacity: 1;
}

.lang-option:focus-visible {
  outline: 2px solid rgba(125, 125, 125, 0.4);
  outline-offset: -2px;
}

.lang-option-active {
  opacity: 1;
  font-weight: 600;
}

.lang-option-name {
  flex: 1;
}

.lang-option-code {
  font-size: 0.7rem;
  opacity: 0.45;
  letter-spacing: 0.04em;
  font-weight: 500;
}

.lang-divider {
  border: none;
  border-top: 1px solid rgba(125, 125, 125, 0.15);
  margin: 0.25rem 0.5rem;
}

html.dark .lang-divider {
  border-top-color: rgba(125, 125, 125, 0.25);
}

.lang-option-icon {
  font-size: 0.9rem;
  opacity: 0.55;
}

/* Dropdown transition */
.lang-dropdown-enter-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.lang-dropdown-leave-active {
  transition:
    opacity 0.1s ease,
    transform 0.1s ease;
}

.lang-dropdown-enter-from,
.lang-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .lang-chevron {
    transition: none;
  }

  .lang-dropdown-enter-active,
  .lang-dropdown-leave-active {
    transition: none;
  }

  .lang-hover-bg {
    transition: none;
  }
}
</style>

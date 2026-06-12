<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { localeConfig } from '~/locales/config'
import { getLocaleFromPath, isSupportedLocale, setPathLocale, supportedLocales } from '~/logics/i18n-path'
import { setLocaleCookie } from '~/logics/locale-cookie'

const router = useRouter()
const route = useRoute()

const currentLocale = computed(() => getLocaleFromPath(route.path))
const availableLocales = supportedLocales

async function changeLang(lang: string) {
  if (!isSupportedLocale(lang))
    return

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
  <VDropdown :distance="6" placement="bottom-end">
    <template #default="{ shown }">
      <button
        :title="$t('action-change-language')"
        :aria-label="$t('action-change-language')"
        class="nav-item select-none op75 hover:op100 transition outline-none"
        aria-haspopup="menu"
        :aria-expanded="shown"
      >
        <div i-carbon-language text-xl />
      </button>
    </template>

    <template #popper="{ hide }">
      <div class="bg-base border border-base rounded py-2 min-w-42 shadow-lg flex flex-col">
        <button
          v-for="lang in availableLocales"
          :key="lang"
          class="px-4 py-2 text-left hover:bg-gray:10 transition flex items-center gap-3 outline-none"
          :class="currentLocale === lang ? 'text-primary font-bold' : 'op70'"
          @click="changeLang(lang); hide()"
        >
          <div class="w-4 flex items-center justify-center">
            <div v-if="currentLocale === lang" i-carbon-checkmark text-sm />
          </div>
          <span>{{ localeConfig[lang].nativeName }}</span>
          <span class="uppercase op50 text-xs">{{ lang }}</span>
        </button>
      </div>
    </template>
  </VDropdown>
</template>

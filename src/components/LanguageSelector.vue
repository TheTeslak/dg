<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getLocaleFromPath, isSupportedLocale, setPathLocale, supportedLocales, userLocalePref } from '~/logics/i18n-path'

const router = useRouter()
const route = useRoute()

const currentLocale = computed(() => getLocaleFromPath(route.path))
const availableLocales = supportedLocales

async function changeLang(lang: string) {
  if (!isSupportedLocale(lang))
    return

  userLocalePref.value = lang

  const newPath = setPathLocale(route.path, lang)
  const target = {
    path: newPath,
    query: route.query,
    hash: route.hash,
  }

  if (newPath === route.path)
    return

  await router.push(target)

  // Alias routes for untranslated articles can be treated as duplicated navigation.
  // In that case, fallback to hard navigation to ensure URL and locale switch.
  if (route.path !== newPath && typeof window !== 'undefined') {
    const href = router.resolve(target).href
    window.location.assign(href)
  }
}
</script>

<template>
  <VDropdown :distance="6" placement="bottom-end">
    <button
      title="Change Language"
      class="nav-item select-none op50 hover:op100 transition outline-none"
    >
      <div i-carbon-language text-xl />
    </button>

    <template #popper="{ hide }">
      <div class="bg-base border border-base rounded py-2 min-w-35 shadow-lg flex flex-col">
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
          <span class="uppercase">{{ lang }}</span>
        </button>
      </div>
    </template>
  </VDropdown>
</template>

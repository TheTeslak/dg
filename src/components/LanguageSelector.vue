<script setup lang="ts">
import { computed } from 'vue'
import { useFluent } from 'fluent-vue'
import { useRouter, useRoute } from 'vue-router'

const fluent = useFluent()
const router = useRouter()
const route = useRoute()

const currentLocale = computed(() => {
  for (const bundle of fluent.bundles.value) {
    return bundle.locales[0]
  }
  return 'en'
})

const availableLocales = ['en', 'ru', 'es']

function changeLang(lang: string) {
  const currentPath = route.path
  // Если путь корневой (например "/"), меняем на "/ru"
  if (currentPath === '/' || currentPath === '/en' || currentPath === '/ru' || currentPath === '/es') {
    router.push(`/${lang}`)
    return
  }
  // Иначе заменяем префикс
  const newPath = currentPath.replace(/^\/[a-z]{2}/, `/${lang}`)
  router.push(newPath)
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
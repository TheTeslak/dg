<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { isSupportedLocale, userLocalePref } from '~/logics/i18n-path'

const router = useRouter()

function getRedirectPath() {
  if (typeof window === 'undefined')
    return '/en'

  // Priority 1: Explicit user choice saved in localStorage
  const saved = userLocalePref.value
  if (saved && isSupportedLocale(saved))
    return `/${saved}`

  // Priority 2: Browser / OS language
  const languages = navigator.languages || [navigator.language]
  for (const lang of languages) {
    const short = lang.split('-')[0]
    if (short === 'ru')
      return '/ru'
    if (short === 'es')
      return '/es'
    if (short === 'en')
      return '/en'
  }

  // Priority 3: Fallback
  return '/en'
}

if (typeof window !== 'undefined') {
  const path = window.location.pathname
  if (path === '/' || path === '/index.html') {
    router.replace(getRedirectPath())
  }
}

onMounted(() => {
  router.replace(getRedirectPath())
})
</script>

<template>
  <div />
</template>

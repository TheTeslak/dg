<script setup lang="ts">
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'

const router = useRouter()

function getRedirectPath() {
  if (typeof window === 'undefined')
    return '/en'
    
  const languages = navigator.languages || [navigator.language]
  for (const lang of languages) {
    if (lang.startsWith('ru')) return '/ru'
    if (lang.startsWith('es')) return '/es'
    if (lang.startsWith('en')) return '/en'
  }
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
<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { defaultLocale } from '~/locales/config'
import { getPreferredLocale } from '~/locales/negotiation'
import { getLocaleCookie } from '~/logics/locale-cookie'

const router = useRouter()
const route = useRoute()

function getRedirectLocale() {
  if (typeof window === 'undefined')
    return defaultLocale

  const languages = navigator.languages.length
    ? navigator.languages
    : [navigator.language]
  return getLocaleCookie() ?? getPreferredLocale(languages.join(','))
}

if (typeof window !== 'undefined') {
  const path = window.location.pathname
  if (path === '/' || path === '/index.html') {
    // This fallback keeps local and static hosting usable when Netlify Edge is absent.
    router.replace({
      path: `/${getRedirectLocale()}`,
      query: route.query,
      hash: route.hash,
    })
  }
}
</script>

<template>
  <div />
</template>

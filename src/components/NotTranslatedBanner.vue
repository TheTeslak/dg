<script setup lang="ts">
import type { SupportedLocale } from '~/logics/i18n-path'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { setPathLocale } from '~/logics/i18n-path'

const props = withDefaults(defineProps<{
  originalLocale?: SupportedLocale
}>(), {
  originalLocale: 'en',
})

const route = useRoute()

const originalTo = computed(() => {
  return {
    path: setPathLocale(route.path, props.originalLocale),
    query: route.query,
    hash: route.hash,
  }
})
</script>

<template>
  <div class="prose m-auto my-8 slide-enter" bg-blue-4:10 text-blue-4 border="l-3 blue-4" px4 py3 flex="~ gap-2 items-center">
    <div i-carbon-translate text-lg flex-none />
    <div>
      {{ $t('page-not-translated') }}
      <RouterLink :to="originalTo" class="underline ml1">
        {{ originalLocale.toUpperCase() }} →
      </RouterLink>
    </div>
  </div>
</template>

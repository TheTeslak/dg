<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const enPath = computed(() => {
  return route.path.replace(/^\/[a-z]{2}/, '/en')
})
</script>

<template>
  <div class="prose m-auto my-8 slide-enter" bg-blue-4:10 text-blue-4 border="l-3 blue-4" px4 py3 flex="~ gap-2 items-center">
    <div i-carbon-translate text-lg flex-none />
    <div>
      {{ $t('page-not-translated') }}
      <RouterLink :to="enPath" class="underline ml1">EN →</RouterLink>
    </div>
  </div>
</template>

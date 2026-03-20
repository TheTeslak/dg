<script setup lang="ts">
import type { SupportedLocale } from '~/logics/i18n-path'

const props = withDefaults(defineProps<{
  originalLocale?: SupportedLocale
  isDraft?: boolean
}>(), {
  originalLocale: 'en',
  isDraft: false,
})
</script>

<template>
  <div v-if="isDraft" class="prose m-auto my-8 slide-enter" bg-orange-4:10 text-orange-4 border="l-3 orange-4" px4 py3 flex="~ gap-2 items-center">
    <div i-carbon-warning text-lg flex-none />
    <div class="text-[75%] leading-tight">
      {{ $t('post-draft-notice') }}
    </div>
  </div>
  <div v-else class="prose m-auto my-8 slide-enter" bg-blue-4:10 text-blue-4 border="l-3 blue-4" px4 py3 flex="~ gap-2 items-center">
    <div i-carbon-translate text-lg flex-none />
    <div class="text-[75%] leading-tight">
      {{ $t('page-not-translated') }}
      <span class="whitespace-nowrap">&nbsp;{{ $t('page-original-version', { lang: props.originalLocale.toUpperCase() }) }}</span>
    </div>
  </div>
</template>

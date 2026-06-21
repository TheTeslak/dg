<script setup lang="ts">
import type { SupportedLocale } from '~/logics/i18n-path'

const props = withDefaults(defineProps<{
  originalLocale?: SupportedLocale
  postType?: string
}>(), {
  originalLocale: 'en',
  postType: 'blog',
})
</script>

<template>
  <div class="prose m-auto my-8 slide-enter" bg-blue-4:10 text-blue-4 border="l-3 blue-4" px4 py3 flex="~ gap-2 items-center">
    <div i-carbon-translate text-lg flex-none aria-hidden="true" />
    <span class="text-[75%] leading-tight">
      {{ $t('page-not-translated', { lang: props.originalLocale.toUpperCase(), type: props.postType }) }}
    </span>
  </div>
</template>

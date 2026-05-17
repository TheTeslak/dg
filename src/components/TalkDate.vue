<script setup lang="ts">
import { formatDate } from '~/logics'
import { getLocaleFromPath } from '~/logics/i18n-path'

const props = defineProps<{
  date: string
}>()

const route = useRoute()
const locale = computed(() => getLocaleFromPath(route.path))

const daysLeft = computed(() => {
  const diff = +new Date(props.date) - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
})
</script>

<template>
  <time :date="date" :title="date" flex="~ col">
    {{ formatDate(props.date, true, locale) }}
    <span v-if="daysLeft > 0" op50 text-xs mt--0.5 inline-block>in {{ daysLeft }} days</span>
  </time>
</template>

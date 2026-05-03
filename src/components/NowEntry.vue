<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getLocaleFromPath } from '~/logics/i18n-path'

const props = defineProps<{
  date: string
}>()

const route = useRoute()
const locale = computed(() => getLocaleFromPath(route.path))

const parsedDate = computed(() => {
  const match = props.date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match)
    return null

  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
})

const formattedDate = computed(() => {
  const date = parsedDate.value
  if (!date)
    return props.date

  const includeYear = date.getFullYear() !== new Date().getFullYear()
  const formatted = new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'long',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date)

  return locale.value === 'ru'
    ? formatted.replace(/\s*г\.$/, '')
    : formatted
})
</script>

<template>
  <section class="now-entry">
    <time :datetime="date" class="now-entry-date">
      {{ formattedDate }}
    </time>
    <div class="now-entry-content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.now-entry {
  margin-top: 2.5rem;
}

.now-entry-date {
  display: block;
  opacity: 0.5;
}

.now-entry-content :deep(> :first-child) {
  margin-top: 0;
}

.now-entry-content :deep(> :last-child) {
  margin-bottom: 0;
}
</style>

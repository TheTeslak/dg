<script setup lang="ts">
import { computed } from 'vue'
import { resolvePath } from '~/logics'
import { useRoute } from 'vue-router'

const props = defineProps<{
  to: string
}>()

const route = useRoute()

const isExternalLink = computed(() => {
  return typeof props.to === 'string' && props.to.startsWith('http')
})

const resolvedTo = computed(() => {
  if (isExternalLink.value) return props.to
  return resolvePath(props.to, route.path)
})
</script>

<template>
  <a v-if="isExternalLink" v-bind="$attrs" :href="to" target="_blank">
    <slot />
  </a>
  <RouterLink v-else v-bind="$props" :to="resolvedTo">
    <slot />
  </RouterLink>
</template>
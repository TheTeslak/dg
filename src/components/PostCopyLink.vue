<script setup lang="ts">
import { useFluent } from 'fluent-vue'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getCanonicalUrl } from '~/logics/site'

const route = useRoute()
const fluent = useFluent()
const copied = ref(false)
let copiedTimeout: ReturnType<typeof setTimeout> | undefined

const url = computed(() => getCanonicalUrl(route.path))
const label = computed(() => {
  return copied.value
    ? fluent.format('post-link-copied')
    : fluent.format('post-copy-link')
})

async function copyLink() {
  await navigator.clipboard.writeText(url.value)
  copied.value = true

  if (copiedTimeout)
    clearTimeout(copiedTimeout)

  copiedTimeout = setTimeout(() => {
    copied.value = false
  }, 2000)
}

onBeforeUnmount(() => {
  if (copiedTimeout)
    clearTimeout(copiedTimeout)
})
</script>

<template>
  <button
    type="button"
    class="post-copy-link"
    :aria-label="label"
    :title="label"
    @click="copyLink"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.post-copy-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  opacity: 0.5;
  cursor: pointer;
  transition:
    color 0.2s ease,
    opacity 0.2s ease;
}

.post-copy-link:hover,
.post-copy-link:focus-visible,
.post-copy-link:active {
  color: var(--fg);
  opacity: 1;
}
</style>

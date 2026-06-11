<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <details class="spoiler">
    <summary class="spoiler-summary">
      <div class="spoiler-arrow i-ri:arrow-right-s-line" />
      <span>{{ title || 'Spoiler' }}</span>
    </summary>
    <div class="spoiler-content">
      <slot />
    </div>
  </details>
</template>

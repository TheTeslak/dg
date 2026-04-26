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

<style scoped>
.spoiler {
  background: rgba(125, 125, 125, 0.08);
  border-radius: 0.5rem;
  margin: 1.25em 0;
  overflow: hidden;
  transition: border-radius 0.25s ease;
}

.spoiler-summary {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.7em 1em;
  cursor: pointer;
  font-size: inherit;
  font-weight: 500;
  color: var(--fg-deep);
  user-select: none;
  list-style: none;
  transition: background 0.2s ease;
}

.spoiler-summary::-webkit-details-marker {
  display: none;
}

.spoiler-summary:hover {
  background: rgba(125, 125, 125, 0.08);
}

.spoiler-arrow {
  font-size: 1.15em;
  opacity: 0.5;
  flex-shrink: 0;
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}

.spoiler[open] > .spoiler-summary .spoiler-arrow {
  transform: rotate(90deg);
  opacity: 0.8;
}

.spoiler-content {
  padding: 0 1em 0.8em;
  font-size: inherit;
  color: var(--fg);
  overflow: hidden;
}

/* Remove extra top margin from the first child inside spoiler content */
.spoiler-content > :deep(*:first-child) {
  margin-top: 0;
}

/* Remove extra bottom margin from the last child inside spoiler content */
.spoiler-content > :deep(*:last-child) {
  margin-bottom: 0;
}
</style>

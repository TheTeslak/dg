<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref } from 'vue'
import { glossaryKey } from '~/logics/glossary'

const props = defineProps<{
  term: string
  definition: string
}>()

const glossary = inject(glossaryKey, null)
const termRef = ref<HTMLElement>()

const isActive = computed(() => {
  return glossary?.active.value?.termEl === termRef.value
})

const isPinned = computed(() => {
  return isActive.value && !!glossary?.active.value?.pinned
})

let hoverTimeout: ReturnType<typeof setTimeout> | null = null

onBeforeUnmount(() => {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
  }
})

function handleClick() {
  if (!glossary || !termRef.value)
    return

  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    hoverTimeout = null
  }

  // Toggle off if clicking the same term and it's already pinned
  if (isPinned.value) {
    // 1. Instantly set pinned to false so the pin flies away
    glossary.setActive({
      term: props.term,
      definition: props.definition,
      termEl: termRef.value,
      pinned: false,
    })
    // 2. Schedule the complete close after 150ms to let the animation start
    hoverTimeout = setTimeout(() => {
      if (glossary.active.value?.termEl === termRef.value && !glossary.active.value?.pinned) {
        glossary.setActive(null)
      }
    }, 150)
    return
  }

  // Pin it
  glossary.setActive({
    term: props.term,
    definition: props.definition,
    termEl: termRef.value,
    pinned: true,
  })
}

function handleMouseEnter() {
  // Ignore hover on mobile - click handles it
  if (typeof window !== 'undefined' && window.innerWidth < 1024)
    return

  if (!glossary || !termRef.value)
    return

  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    hoverTimeout = null
  }

  // Hovering the already pinned term should not unpin it. Hovering another
  // term replaces the pinned state with a regular hover preview.
  if (glossary.active.value?.pinned && glossary.active.value.termEl === termRef.value)
    return

  glossary.setActive({
    term: props.term,
    definition: props.definition,
    termEl: termRef.value,
    pinned: false,
  })
}

function handleMouseLeave() {
  if (typeof window !== 'undefined' && window.innerWidth < 1024)
    return

  if (!glossary)
    return

  // Only clear if this term is active and NOT pinned
  if (isActive.value && !isPinned.value) {
    hoverTimeout = setTimeout(() => {
      // Check again if we're still the active one before clearing
      if (glossary.active.value?.termEl === termRef.value && !glossary.active.value?.pinned) {
        glossary.setActive(null)
      }
    }, 300)
  }
}
</script>

<template>
  <span
    ref="termRef"
    class="glossary-term"
    :class="{ 'is-active': isActive, 'is-pinned': isPinned }"
    role="button"
    tabindex="0"
    :aria-label="term"
    :aria-expanded="isActive"
    @click.stop="handleClick"
    @keydown.enter.stop.prevent="handleClick"
    @keydown.space.stop.prevent="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <slot />
  </span>
</template>

<style scoped>
.glossary-term {
  cursor: pointer;
  border-bottom: 1.5px dashed rgba(125, 125, 125, 0.45);
  transition: border-bottom-color 0.3s ease-in-out;
}

.glossary-term:hover,
.glossary-term.is-active,
.glossary-term.is-pinned {
  border-bottom-color: var(--fg, #555);
  animation: none !important;
}

html.dark .glossary-term {
  border-bottom-color: rgba(125, 125, 125, 0.6);
}

html.dark .glossary-term:hover,
html.dark .glossary-term.is-active,
html.dark .glossary-term.is-pinned {
  border-bottom-color: var(--fg, #bbb);
  animation: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .glossary-term {
    animation: none !important;
    transition: none;
  }
}
</style>

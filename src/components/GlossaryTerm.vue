<script setup lang="ts">
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

function handleClick() {
  if (!glossary || !termRef.value)
    return

  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    hoverTimeout = null
  }

  // Toggle off if clicking the same term and it's already pinned
  if (isPinned.value) {
    glossary.setActive(null)
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

  // If another term is currently pinned, don't override it with hover
  if (glossary.active.value?.pinned && glossary.active.value.termEl !== termRef.value)
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
    }, 300) // 300ms grace period
  }
}
</script>

<template>
  <span
    ref="termRef"
    class="glossary-term"
    :class="{ 'is-active': isActive }"
    role="button"
    tabindex="0"
    :aria-label="term"
    @click.stop="handleClick"
    @keydown.enter.prevent="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <slot />
  </span>
</template>

<style scoped>
.glossary-term {
  border-bottom: 1.5px dashed rgba(125, 125, 125, 0.45);
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.glossary-term:hover,
.glossary-term.is-active {
  border-bottom-color: var(--fg, #555);
}

html.dark .glossary-term {
  border-bottom-color: rgba(125, 125, 125, 0.6);
}

html.dark .glossary-term:hover,
html.dark .glossary-term.is-active {
  border-bottom-color: var(--fg, #bbb);
}
</style>

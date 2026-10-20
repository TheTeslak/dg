<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { useFluent } from 'fluent-vue'
import { getAsciiPreset } from '~/data/ascii'

const props = defineProps<{
  label?: string
  preset?: string
}>()

const presetText = computed(() => getAsciiPreset(props.preset))

const ariaLabel = computed(() => {
  if (props.label)
    return `${props.label} (ASCII)`
  if (props.preset)
    return `${props.preset} (ASCII)`
  return 'ASCII art'
})

interface Spark {
  id: number
  x: number
  y: number
  text: string
  isError: boolean
}

const { $t } = useFluent()
const preferredMotion = usePreferredReducedMotion()

const el = useTemplateRef<HTMLElement>('el')
const isFlashing = ref(false)
const sparks = ref<Spark[]>([])
const statusMessage = ref('')
let nextSparkId = 0
let flashTimeout: ReturnType<typeof setTimeout> | null = null
const sparkTimeouts = new Map<number, ReturnType<typeof setTimeout>>()
let pointerDownPos = { x: 0, y: 0 }

function onPointerDown(e: PointerEvent) {
  pointerDownPos = { x: e.clientX, y: e.clientY }
}

function removeSpark(id: number) {
  const timeout = sparkTimeouts.get(id)
  if (timeout) {
    clearTimeout(timeout)
    sparkTimeouts.delete(id)
  }
  sparks.value = sparks.value.filter(s => s.id !== id)
}

function sanitizeAsciiForCopy(text: string): string {
  const lines = text.split('\n')
  while (lines.length > 0 && lines[0].trim() === '')
    lines.shift()
  while (lines.length > 0 && lines[lines.length - 1].trim() === '')
    lines.pop()
  return lines.join('\n')
}

function getAsciiText(): string {
  if (presetText.value)
    return presetText.value
  const preEl = el.value?.querySelector('pre')
  return preEl?.textContent || ''
}

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    }
    catch {
      return false
    }
  }
  return false
}

function addSpark(success: boolean, coords?: { x: number, y: number }) {
  isFlashing.value = true
  if (flashTimeout)
    clearTimeout(flashTimeout)
  flashTimeout = setTimeout(() => {
    isFlashing.value = false
  }, 180)

  let x = 0
  let y = 0
  if (el.value) {
    const rect = el.value.getBoundingClientRect()
    if (coords && typeof coords.x === 'number' && !Number.isNaN(coords.x)
      && typeof coords.y === 'number' && !Number.isNaN(coords.y)) {
      x = coords.x
      y = coords.y
    }
    else {
      x = rect.width / 2
      y = rect.height / 2
    }
  }

  while (sparks.value.length >= 5) {
    const oldest = sparks.value[0]
    if (oldest)
      removeSpark(oldest.id)
    else
      break
  }

  const id = ++nextSparkId
  const text = success ? `${$t('state-link-copied')}!` : '✕'
  statusMessage.value = success ? `${$t('state-link-copied')}!` : '✕'

  sparks.value.push({ id, x, y, text, isError: !success })

  const timeoutDuration = preferredMotion.value === 'reduce' ? 1400 : 2000
  const timer = setTimeout(() => {
    removeSpark(id)
  }, timeoutDuration)
  sparkTimeouts.set(id, timer)
}

async function performCopy(coords?: { x: number, y: number }) {
  const text = sanitizeAsciiForCopy(getAsciiText())
  if (!text)
    return

  const success = await copyText(text)
  addSpark(success, coords)
}

function handleClick(e: MouseEvent) {
  let coords: { x: number, y: number } | undefined
  if (e.clientX !== 0 || e.clientY !== 0) {
    const dx = Math.abs(e.clientX - pointerDownPos.x)
    const dy = Math.abs(e.clientY - pointerDownPos.y)
    if (dx > 6 || dy > 6)
      return

    if (el.value) {
      const rect = el.value.getBoundingClientRect()
      coords = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
  }

  performCopy(coords)
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.repeat)
    return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    performCopy()
  }
}

onUnmounted(() => {
  if (flashTimeout)
    clearTimeout(flashTimeout)
  for (const timer of sparkTimeouts.values()) {
    clearTimeout(timer)
  }
  sparkTimeouts.clear()
  sparks.value = []
})
</script>

<template>
  <div
    ref="el"
    class="ascii-wrapper relative group inline-block my-6"
    :class="{ 'is-flashing': isFlashing }"
    role="button"
    tabindex="0"
    :aria-label="ariaLabel"
    @pointerdown="onPointerDown"
    @click="handleClick"
    @keydown="handleKeyDown"
  >
    <slot>
      <pre v-if="presetText" class="ascii-art font-mono" v-text="presetText" />
    </slot>
    <span
      v-for="spark in sparks"
      :key="spark.id"
      class="ascii-float-text"
      :class="{
        'is-reduced': preferredMotion === 'reduce',
        'is-error text-red-500 dark:text-red-400': spark.isError,
      }"
      :style="{ left: `${spark.x}px`, top: `${spark.y}px` }"
    >
      {{ spark.text }}
    </span>
    <div role="status" aria-live="polite" class="sr-only">
      <span v-if="sparks.length > 0">{{ statusMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
.ascii-wrapper {
  max-width: 100%;
  overflow: visible;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
}

.ascii-wrapper:focus-visible {
  outline: 2px solid rgb(125 125 125 / 55%);
  outline-offset: 4px;
  border-radius: 4px;
}

:deep(.ascii-art) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.95rem;
  line-height: 1.08 !important;
  letter-spacing: 0;
  white-space: pre !important;
  overflow: visible !important;
  width: fit-content;
  max-width: 100%;
  color: var(--fg);
  margin: 0 !important;
  background: transparent !important;
  padding: 0 !important;
  border: 0 !important;
  cursor: pointer;
  user-select: none !important;
  -webkit-user-select: none !important;
  transition:
    color 0.15s ease,
    opacity 0.15s ease;
}

.ascii-wrapper:hover :deep(.ascii-art) {
  opacity: 0.65;
}

.ascii-wrapper.is-flashing :deep(.ascii-art) {
  opacity: 0.42 !important;
}

.ascii-float-text {
  position: absolute;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--fg);
  line-height: 1;
  z-index: 20;
  will-change: transform, opacity;
  animation: float-up 2s ease-out forwards;
}

.ascii-float-text.is-reduced {
  animation: fade-reduced 1.4s ease-out forwards;
  transform: translate(-50%, -50%);
}

@keyframes float-up {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, calc(-50% - 64px));
  }
}

@keyframes fade-reduced {
  0% {
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>

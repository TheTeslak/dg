<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { useFluent } from 'fluent-vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  muted?: boolean
  trigger: string
}>(), {
  muted: false,
})

const fluent = useFluent()
const triggerRef = ref<HTMLButtonElement>()
const popoverRef = ref<HTMLElement>()
const isOpen = ref(false)
const isPositioned = ref(false)
const placement = ref<'top' | 'bottom'>('bottom')
const positionStyle = ref<CSSProperties>({})
const popoverId = useId()
const bodyId = `${popoverId}-body`
const closeLabel = computed(() => fluent.format('nav-close'))
const triggerLabel = computed(() => isOpen.value
  ? `${closeLabel.value}: ${props.label}`
  : props.label)

const VIEWPORT_GUTTER = 14
const TRIGGER_GAP = 6

let positionFrame: number | null = null

function updatePosition(isScroll = false) {
  if (typeof window === 'undefined' || !isOpen.value)
    return

  const trigger = triggerRef.value
  const popover = popoverRef.value
  if (!trigger || !popover)
    return

  const triggerRect = trigger.getBoundingClientRect()
  const popoverWidth = popover.offsetWidth
  const popoverHeight = popover.offsetHeight
  const spaceBelow = window.innerHeight - triggerRect.bottom - TRIGGER_GAP - VIEWPORT_GUTTER
  const spaceAbove = triggerRect.top - TRIGGER_GAP - VIEWPORT_GUTTER

  placement.value = popoverHeight > spaceBelow && spaceAbove > spaceBelow
    ? 'top'
    : 'bottom'

  const desiredTop = placement.value === 'top'
    ? triggerRect.top - popoverHeight - TRIGGER_GAP
    : triggerRect.bottom + TRIGGER_GAP
  const maxTop = Math.max(VIEWPORT_GUTTER, window.innerHeight - popoverHeight - VIEWPORT_GUTTER)
  const top = Math.min(Math.max(desiredTop, VIEWPORT_GUTTER), maxTop)

  if (!isScroll) {
    const triggerCenter = triggerRect.left + triggerRect.width / 2
    const maxLeft = Math.max(VIEWPORT_GUTTER, window.innerWidth - popoverWidth - VIEWPORT_GUTTER)
    const left = Math.min(
      Math.max(triggerCenter - popoverWidth / 2, VIEWPORT_GUTTER),
      maxLeft,
    )
    const originX = Math.min(
      Math.max(triggerCenter - left, 12),
      popoverWidth - 12,
    )

    positionStyle.value = {
      'left': `${Math.round(left)}px`,
      'top': `${Math.round(top)}px`,
      '--popover-origin-x': `${Math.round(originX)}px`,
      '--popover-origin-y': placement.value === 'top' ? '100%' : '0%',
    }
  }
  else {
    positionStyle.value = {
      ...positionStyle.value,
      'top': `${Math.round(top)}px`,
      '--popover-origin-y': placement.value === 'top' ? '100%' : '0%',
    }
  }
  isPositioned.value = true
}

function schedulePosition(isScroll = false) {
  if (typeof window === 'undefined' || !isOpen.value)
    return

  if (positionFrame !== null)
    cancelAnimationFrame(positionFrame)

  positionFrame = requestAnimationFrame(() => {
    positionFrame = null
    updatePosition(isScroll)
  })
}

async function openPopover() {
  isPositioned.value = false
  isOpen.value = true
  await nextTick()
  updatePosition()
}

function closePopover(restoreFocus = true) {
  if (!isOpen.value)
    return

  isOpen.value = false
  if (restoreFocus) {
    nextTick(() => {
      triggerRef.value?.focus({ preventScroll: true })
    })
  }
}

function togglePopover() {
  if (isOpen.value)
    closePopover()
  else
    openPopover()
}

function handlePointerDown(event: PointerEvent) {
  if (!isOpen.value)
    return

  const path = event.composedPath()
  if (path.includes(triggerRef.value as EventTarget) || path.includes(popoverRef.value as EventTarget))
    return

  closePopover(false)
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true')
}

function handleKeydown(event: KeyboardEvent) {
  if (!isOpen.value)
    return

  if (event.key === 'Escape') {
    event.preventDefault()
    closePopover()
    return
  }

  if (event.key === 'Tab') {
    const popover = popoverRef.value
    const trigger = triggerRef.value
    if (!popover || !trigger)
      return

    const focusables = getFocusableElements(popover)
    if (focusables.length === 0)
      return

    const activeEl = document.activeElement

    if (activeEl === trigger && !event.shiftKey) {
      event.preventDefault()
      focusables[0].focus()
      return
    }

    if (activeEl === focusables[0] && event.shiftKey) {
      event.preventDefault()
      trigger.focus()
      return
    }

    if (activeEl === focusables[focusables.length - 1] && !event.shiftKey) {
      event.preventDefault()
      trigger.focus()
    }
  }
}

function handleViewportChange() {
  const trigger = triggerRef.value
  if (!trigger)
    return

  const rect = trigger.getBoundingClientRect()
  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    closePopover(false)
    return
  }

  schedulePosition(true)
}

function handleResize() {
  schedulePosition(false)
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleViewportChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleViewportChange, true)

  if (positionFrame !== null)
    cancelAnimationFrame(positionFrame)
})
</script>

<template>
  <span class="info-popover-root" :class="{ 'is-muted': props.muted }">
    <button
      ref="triggerRef"
      type="button"
      class="info-popover-trigger"
      :class="{ 'is-open': isOpen }"
      :aria-label="triggerLabel"
      :aria-expanded="isOpen"
      :aria-controls="popoverId"
      :aria-describedby="isOpen ? bodyId : undefined"
      @click="togglePopover"
    >
      <span>{{ props.trigger }}</span>
      <span class="popover-trigger-close-slot" aria-hidden="true">
        <span i-ri-close-line class="popover-trigger-close-icon" />
      </span>
    </button>

    <ClientOnly>
      <Teleport to="body">
        <Transition name="info-popover" @after-leave="isPositioned = false">
          <div
            v-if="isOpen"
            :id="popoverId"
            ref="popoverRef"
            class="info-popover-surface"
            :class="[
              `is-${placement}`,
              { 'is-positioned': isPositioned },
            ]"
            :style="positionStyle"
            role="region"
            :aria-label="props.label"
          >
            <div :id="bodyId" class="info-popover-body">
              <slot />
            </div>
          </div>
        </Transition>
      </Teleport>
    </ClientOnly>
  </span>
</template>

<style scoped>
.info-popover-root {
  display: inline-block;
  vertical-align: baseline;
}

.info-popover-root.is-muted {
  --info-popover-trigger-color: var(--fg-light, #888);
}

.info-popover-trigger {
  position: relative;
  z-index: 0;
  isolation: isolate;
  appearance: none;
  display: inline-flex;
  align-items: center;
  margin: 0 0.02em;
  border: 0;
  border-radius: 0.35em;
  padding: 0 0.5em 0.025em;
  background: transparent;
  color: var(--info-popover-trigger-color, inherit);
  font: inherit;
  line-height: inherit;
  text-align: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 180ms ease,
    transform 120ms ease;
}

.info-popover-trigger::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  border-radius: inherit;
  background: rgb(125 125 125 / 14%);
  content: '';
  opacity: 0.9;
  transform: scaleX(0.94);
  transform-origin: center;
  transition:
    background-color 180ms ease,
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

@media (hover: hover) {
  .info-popover-trigger:hover {
    color: var(--fg, inherit);
  }

  .info-popover-trigger:hover::before {
    background: rgb(125 125 125 / 20%);
    opacity: 1;
    transform: scaleX(1.01);
  }
}

.info-popover-trigger.is-open {
  color: var(--fg, inherit);
}

.info-popover-trigger.is-open::before {
  background: rgb(125 125 125 / 20%);
  opacity: 1;
  transform: scaleX(1.01);
}

.info-popover-trigger:focus-visible {
  outline: 2px solid rgb(125 125 125 / 55%);
  outline-offset: 2px;
}

.info-popover-trigger:active {
  transform: translateY(1px) scale(0.98);
}

.popover-trigger-close-slot {
  display: inline-flex;
  align-items: center;
  width: 0;
  margin-inline-start: 0;
  overflow: hidden;
  color: inherit;
  opacity: 0;
  transition:
    color 160ms ease,
    opacity 80ms ease,
    width 160ms cubic-bezier(0.4, 0, 1, 1) 60ms,
    margin-inline-start 160ms cubic-bezier(0.4, 0, 1, 1) 60ms;
}

.info-popover-trigger.is-open .popover-trigger-close-slot {
  width: 0.9em;
  margin-inline-start: 0.16em;
  opacity: 0.46;
  transition:
    color 160ms ease,
    width 180ms cubic-bezier(0.16, 1, 0.3, 1),
    margin-inline-start 180ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 110ms ease 70ms;
}

.popover-trigger-close-icon {
  display: block;
  flex: 0 0 0.9em;
  width: 0.9em;
  height: 0.9em;
  line-height: 1;
  vertical-align: middle;
}

@media (hover: hover) {
  .info-popover-trigger:hover .popover-trigger-close-slot {
    opacity: 0.85;
  }
}

.info-popover-surface {
  --info-popover-bg: rgb(255 255 255 / 97%);
  --info-popover-border: rgb(0 0 0 / 11%);
  position: fixed;
  z-index: 450;
  width: max-content;
  max-width: min(22rem, calc(100vw - 28px));
  border: 1px solid var(--info-popover-border);
  border-radius: 0.75rem;
  background: var(--info-popover-bg);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.02),
    0 6px 12px rgba(0, 0, 0, 0.03),
    0 16px 32px rgba(0, 0, 0, 0.05);
  color: #555;
  font-size: 1rem;
  line-height: 1.5;
  opacity: 0;
  transform-origin: var(--popover-origin-x) var(--popover-origin-y);
  visibility: hidden;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.info-popover-surface.is-positioned {
  opacity: 1;
  visibility: visible;
}

html.dark .info-popover-surface {
  --info-popover-bg: #191919;
  --info-popover-border: rgb(255 255 255 / 13%);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.25),
    0 8px 16px rgba(0, 0, 0, 0.35),
    0 20px 40px rgba(0, 0, 0, 0.55);
  color: #bbb;
}

.info-popover-body {
  position: relative;
  z-index: 1;
  min-width: min(15rem, calc(100vw - 48px));
  padding: 0.85rem 1.1rem 0.9rem;
}

.info-popover-enter-active {
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.info-popover-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms cubic-bezier(0.4, 0, 1, 1),
    visibility 140ms step-end;
}

.info-popover-enter-from.is-bottom,
.info-popover-leave-to.is-bottom {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}

.info-popover-enter-from.is-top,
.info-popover-leave-to.is-top {
  opacity: 0;
  transform: translateY(4px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .info-popover-trigger,
  .info-popover-trigger::before,
  .info-popover-surface,
  .popover-trigger-close-slot {
    transition: none;
  }

  .info-popover-enter-from,
  .info-popover-leave-to {
    transform: none;
  }
}
</style>

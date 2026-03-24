<script setup lang="ts">
import { getCanonicalUrl } from '~/logics/site'

defineProps<{
  title: string
  duration?: string
}>()

const route = useRoute()

const isHovered = ref(false)
const isNearLeftEdge = ref(false)
const LEFT_REVEAL_ZONE_PX = 240
const trackEl = ref<HTMLElement>()
const isAwake = computed(() => isHovered.value || isNearLeftEdge.value)

const scrollY = ref(0)
const docHeight = ref(1)
const winHeight = ref(0)

interface Heading {
  id: string
  text: string
  level: number
  offsetTop: number
}

const headings = ref<Heading[]>([])

// Dot is a tiny line segment; gaps surround it
const DOT_HEIGHT = 3
const GAP_SIZE = 4
const STEP_SIZE = 22
const STEP_GAP_MULTIPLIER = 1.5
const PADDING_TOP = 16
const PADDING_BOTTOM = 16

const scrollWrapperEl = ref<HTMLElement>()

function collectHeadings() {
  const article = document.querySelector('article')
  if (!article)
    return

  const els = article.querySelectorAll('h2, h3')
  const items: Heading[] = []

  els.forEach((el) => {
    const heading = el as HTMLElement
    if (heading.id) {
      items.push({
        id: heading.id,
        text: heading.textContent?.replace('#', '').trim() || '',
        level: Number.parseInt(heading.tagName[1]),
        offsetTop: heading.offsetTop,
      })
    }
  })

  headings.value = items
  docHeight.value = Math.max(1, document.documentElement.scrollHeight)
  winHeight.value = window.innerHeight
}

// Dot positions: dynamic stepping based on hierarchy rules
const dotPositions = computed(() => {
  const pos: number[] = []
  let currentY = PADDING_TOP

  for (let i = 0; i < headings.value.length; i++) {
    if (i > 0) {
      const prev = headings.value[i - 1]
      const curr = headings.value[i]
      let gap = STEP_SIZE
      // If current heading is higher level (e.g. going from h3 back to h2)
      if (curr.level < prev.level) {
        gap = STEP_SIZE * STEP_GAP_MULTIPLIER
      }
      currentY += gap
    }
    pos.push(currentY)
  }
  return pos
})

// Track height calculates from the very last dot
const trackHeight = computed(() => {
  if (!dotPositions.value.length)
    return PADDING_TOP + PADDING_BOTTOM
  return dotPositions.value[dotPositions.value.length - 1] + DOT_HEIGHT + PADDING_BOTTOM
})

// Line segments: the thin lines strictly BETWEEN dots
const lineSegments = computed(() => {
  const segs: { y1: number, y2: number }[] = []
  const dots = dotPositions.value

  if (dots.length <= 1)
    return segs

  for (let i = 0; i < dots.length - 1; i++) {
    const y1 = dots[i] + DOT_HEIGHT + GAP_SIZE
    const y2 = dots[i + 1] - GAP_SIZE
    if (y2 > y1) {
      segs.push({ y1, y2 })
    }
  }

  return segs
})

// Scroll spy: which heading is active
const activeIndex = computed(() => {
  const threshold = scrollY.value + winHeight.value * 0.3
  let active = -1
  for (let i = 0; i < headings.value.length; i++) {
    if (headings.value[i].offsetTop <= threshold)
      active = i
  }
  return active
})

// Auto-scroll the ToC so that the active item is visible
watch(activeIndex, (idx) => {
  const wrapper = scrollWrapperEl.value
  if (!wrapper || idx < 0)
    return
  const targetY = dotPositions.value[idx] ?? 0
  const wrapperH = wrapper.clientHeight
  // Scroll so the active item is roughly centered
  const desired = targetY - wrapperH / 2 + STEP_SIZE / 2
  wrapper.scrollTo({ top: Math.max(0, desired), behavior: 'smooth' })
})

// ── Mobile ToC logic ──
const isMobileOpen = ref(false)

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 40
    // If mobile ToC is open, close it first then scroll after animation
    if (isMobileOpen.value) {
      isMobileOpen.value = false
      setTimeout(() => {
        window.scrollTo({ top: y, behavior: 'smooth' })
      }, 350)
    }
    else {
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }
}

function onScroll() {
  scrollY.value = window.scrollY
}

function onMouseMove(e: MouseEvent) {
  isNearLeftEdge.value = e.clientX <= LEFT_REVEAL_ZONE_PX
}

let recalcTimer: ReturnType<typeof setTimeout> | undefined
function scheduleRecalc() {
  clearTimeout(recalcTimer)
  recalcTimer = setTimeout(collectHeadings, 200)
}

watch(isMobileOpen, (open) => {
  if (open) {
    document.body.style.overflow = 'hidden'
  }
  else {
    document.body.style.overflow = ''
  }
})

function closeMobileSheet() {
  isMobileOpen.value = false
}

// ── Mobile Copy Link logic ──
const mobileCopied = ref(false)
let mobileCopiedTimeout: ReturnType<typeof setTimeout> | undefined

async function mobileCopyLink() {
  const url = getCanonicalUrl(route.path)
  await navigator.clipboard.writeText(url)
  mobileCopied.value = true
  if (mobileCopiedTimeout)
    clearTimeout(mobileCopiedTimeout)
  mobileCopiedTimeout = setTimeout(() => {
    mobileCopied.value = false
  }, 2000)
}

onMounted(() => {
  scrollY.value = window.scrollY
  setTimeout(collectHeadings, 300)
  setTimeout(collectHeadings, 1500)

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('resize', scheduleRecalc, { passive: true })

  const ro = new ResizeObserver(scheduleRecalc)
  ro.observe(document.body)

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('resize', scheduleRecalc)
    ro.disconnect()
    document.body.style.overflow = ''
    if (mobileCopiedTimeout)
      clearTimeout(mobileCopiedTimeout)
  })
})
</script>

<template>
  <!-- ── Desktop ToC (unchanged) ── -->
  <div
    v-if="headings.length > 1"
    class="scroll-toc"
    :class="{ 'is-hovered': isHovered, 'is-awake': isAwake }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="table-of-contents-anchor scroll-toc-anchor-hint">
      <div class="i-ri-menu-2-fill" />
    </div>

    <!-- Title (appears on hover) -->
    <div class="scroll-toc-title">
      <div class="scroll-toc-title-text">
        {{ title }}
      </div>
      <div v-if="duration" class="scroll-toc-title-duration">
        {{ duration }}
      </div>
    </div>

    <!-- Scrollable wrapper for the track area -->
    <div ref="scrollWrapperEl" class="scroll-toc-scroll-wrapper">
      <!-- Track area -->
      <div ref="trackEl" class="scroll-toc-track" :style="{ height: `${trackHeight}px` }">
        <!-- SVG draws: line segments + dot segments -->
        <svg
          class="scroll-toc-svg"
          :width="8"
          :height="trackHeight"
          :viewBox="`0 0 8 ${trackHeight}`"
        >
          <!-- Thin line segments (between dot gaps) -->
          <line
            v-for="(seg, i) in lineSegments"
            :key="`seg-${i}`"
            x1="4"
            :y1="seg.y1"
            x2="4"
            :y2="seg.y2"
            class="scroll-toc-line"
          />

          <!-- Dot segments: tiny line pieces that look like dots -->
          <line
            v-for="(pos, i) in dotPositions"
            :key="`dot-${i}`"
            x1="4"
            :y1="pos"
            x2="4"
            :y2="pos + DOT_HEIGHT"
            stroke-linecap="round"
            class="scroll-toc-dot"
            :class="{ 'is-active': i === activeIndex }"
          />
        </svg>

        <!-- Heading labels (positioned over the SVG, appear on hover) -->
        <div
          v-for="(heading, i) in headings"
          :key="heading.id"
          class="scroll-toc-item"
          :class="{
            'is-active': i === activeIndex,
            'is-h3': heading.level === 3,
          }"
          :style="{ top: `${dotPositions[i] + DOT_HEIGHT / 2}px` }"
          @click="scrollToHeading(heading.id)"
        >
          <span class="scroll-toc-label">{{ heading.text }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Mobile Action Bar ── -->
  <div v-if="headings.length > 1" class="mobile-action-bar">
    <!-- Open ToC button -->
    <button
      class="mobile-action-btn"
      :title="$t('heading-link')"
      @click="isMobileOpen = true"
    >
      <div class="i-ri-menu-2-fill" />
    </button>
    <!-- Copy Link button -->
    <button
      class="mobile-action-btn"
      :class="{ 'is-copied': mobileCopied }"
      :title="mobileCopied ? $t('post-link-copied') : $t('post-copy-link')"
      @click="mobileCopyLink()"
    >
      <div :class="mobileCopied ? 'i-ri-check-line' : 'i-ri-links-line'" />
    </button>
  </div>

  <!-- ── Mobile Bottom Sheet ── -->
  <Teleport to="body">
    <Transition name="mobile-toc-backdrop">
      <div
        v-if="isMobileOpen"
        class="mobile-toc-backdrop"
        @click="closeMobileSheet"
      />
    </Transition>
    <Transition name="mobile-toc-sheet">
      <div
        v-if="isMobileOpen"
        class="mobile-toc-sheet"
      >
        <!-- Sheet header -->
        <div class="mobile-toc-sheet-header">
          <div class="mobile-toc-sheet-title">
            {{ title }}
          </div>
          <button class="mobile-toc-sheet-close" @click="closeMobileSheet">
            <div i-ri-close-line />
          </button>
        </div>
        <div v-if="duration" class="mobile-toc-sheet-duration">
          {{ duration }}
        </div>
        <!-- Sheet content: heading list -->
        <div class="mobile-toc-sheet-list">
          <button
            v-for="(heading, i) in headings"
            :key="heading.id"
            class="mobile-toc-sheet-item"
            :class="{
              'is-active': i === activeIndex,
              'is-h3': heading.level === 3,
            }"
            @click="scrollToHeading(heading.id)"
          >
            {{ heading.text }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
/* ── Desktop Container ── */
.scroll-toc {
  position: fixed;
  left: 18px;
  top: 80px;
  bottom: 40px;
  z-index: 200;
  width: 200px;
  pointer-events: auto;
  cursor: default;
  display: none;
  /* Flex column so title + scroll-wrapper stack naturally */
  flex-direction: column;
}

.scroll-toc::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  right: 100%;
  width: 18px;
}

@media (min-width: 1024px) {
  .scroll-toc {
    display: flex;
  }
}

@media (min-width: 1280px) {
  .scroll-toc {
    left: 28px;
    width: 260px;
  }
  .scroll-toc::before {
    width: 28px;
  }
}

/* ── Scrollable wrapper ── */
.scroll-toc-scroll-wrapper {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: clip;
  /* Hide scrollbar visually but keep scroll functionality */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  opacity: 0;
  transform: translateX(-8px);
  pointer-events: none;
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.scroll-toc-scroll-wrapper::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.scroll-toc.is-awake .scroll-toc-scroll-wrapper {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

/* ── Track area (holds SVG + labels) ── */
.scroll-toc-track {
  position: relative;
  left: 0;
  width: 100%;
}

.scroll-toc-anchor-hint {
  flex-shrink: 0;
  margin-left: 0 !important;
  margin-right: 0 !important;
  opacity: 1;
  transform: translateX(0);
  pointer-events: none;
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.scroll-toc.is-awake .scroll-toc-anchor-hint {
  opacity: 0;
  transform: translateX(-6px);
}

.scroll-toc-svg {
  position: absolute;
  left: 4px;
  top: 2px;
  overflow: visible;
}

/* ── SVG elements ── */

/* Thin line segments between dot gaps */
.scroll-toc-line {
  stroke: rgba(150, 150, 150, 0.22);
  stroke-width: 1.5;
}

html.dark .scroll-toc-line {
  stroke: rgba(150, 150, 150, 0.13);
}

/* Dot segments (tiny line pieces that look like dots) */
.scroll-toc-dot {
  stroke: rgba(130, 130, 130, 0.5);
  stroke-width: 2.5;
  transition: stroke 0.3s ease;
}

html.dark .scroll-toc-dot {
  stroke: rgba(170, 170, 170, 0.35);
}

.scroll-toc-dot.is-active {
  stroke: rgba(80, 80, 80, 0.9);
  stroke-width: 3;
}

html.dark .scroll-toc-dot.is-active {
  stroke: rgba(210, 210, 210, 0.7);
}

/* ── Heading labels ── */
.scroll-toc-item {
  position: absolute;
  left: 20px;
  transform: translateY(-50%);
  cursor: pointer;
  padding: 2px 0;
}

.scroll-toc-label {
  font-size: 0.82rem;
  line-height: 1.3;
  color: rgba(80, 80, 80, 0.65);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
  opacity: 0;
  transform: translateX(-4px);
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
  pointer-events: none;
}

html.dark .scroll-toc-label {
  color: rgba(200, 200, 200, 0.55);
}

.scroll-toc-item.is-active .scroll-toc-label {
  color: rgba(40, 40, 40, 0.95);
  font-weight: 500;
}

html.dark .scroll-toc-item.is-active .scroll-toc-label {
  color: rgba(230, 230, 230, 0.85);
}

.scroll-toc-item.is-h3 .scroll-toc-label {
  font-size: 0.78rem;
  padding-left: 8px;
}

.scroll-toc-item:hover .scroll-toc-label {
  color: #000;
  text-decoration: underline;
  text-decoration-color: rgba(0, 0, 0, 0.3);
  text-underline-offset: 3px;
}

html.dark .scroll-toc-item:hover .scroll-toc-label {
  color: #fff;
  text-decoration: underline;
  text-decoration-color: rgba(255, 255, 255, 0.3);
  text-underline-offset: 3px;
}

/* Show labels on hover */
.scroll-toc.is-hovered .scroll-toc-label {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

/* ── Title block (top, visible on hover) ── */
.scroll-toc-title {
  flex-shrink: 0;
  left: 4px;
  pointer-events: none;
  opacity: 0;
  transform: translateX(-4px);
  margin-bottom: 8px;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.scroll-toc.is-hovered .scroll-toc-title {
  opacity: 1;
  transform: translateX(0);
}

.scroll-toc-title-text {
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.25;
  color: rgba(40, 40, 40, 0.85);
  max-width: 185px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

html.dark .scroll-toc-title-text {
  color: rgba(220, 220, 220, 0.8);
}

.scroll-toc-title-duration {
  font-size: 0.75rem;
  color: rgba(120, 120, 120, 0.55);
  margin-top: 2px;
}

html.dark .scroll-toc-title-duration {
  color: rgba(160, 160, 160, 0.45);
}

@media (min-width: 1280px) {
  .scroll-toc-label {
    max-width: 220px;
  }
  .scroll-toc-title-text {
    max-width: 235px;
  }
}

@media print {
  .scroll-toc {
    display: none !important;
  }
  .mobile-action-bar {
    display: none !important;
  }
}

/* ═══════════════════════════════════════════════
   MOBILE ACTION BAR
   ═══════════════════════════════════════════════ */
.mobile-action-bar {
  display: none;
}

@media (max-width: 1023px) {
  .mobile-action-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  html.dark .mobile-action-bar {
    background: rgba(0, 0, 0, 0.72);
    border-top-color: rgba(255, 255, 255, 0.06);
  }
}

.mobile-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 0;
  border-radius: 0.75rem;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.55);
  cursor: pointer;
  font-size: 1.15rem;
  transition:
    background 0.2s ease,
    color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

html.dark .mobile-action-btn {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.55);
}

.mobile-action-btn:active {
  background: rgba(0, 0, 0, 0.12);
}

html.dark .mobile-action-btn:active {
  background: rgba(255, 255, 255, 0.15);
}

.mobile-action-btn.is-copied {
  color: rgba(34, 170, 85, 0.85);
}

html.dark .mobile-action-btn.is-copied {
  color: rgba(80, 220, 130, 0.85);
}

/* ═══════════════════════════════════════════════
   MOBILE BOTTOM SHEET
   ═══════════════════════════════════════════════ */

/* Backdrop */
.mobile-toc-backdrop {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgba(0, 0, 0, 0.4);
  -webkit-tap-highlight-color: transparent;
}

html.dark .mobile-toc-backdrop {
  background: rgba(0, 0, 0, 0.6);
}

/* Backdrop transition */
.mobile-toc-backdrop-enter-active,
.mobile-toc-backdrop-leave-active {
  transition: opacity 0.3s ease;
}
.mobile-toc-backdrop-enter-from,
.mobile-toc-backdrop-leave-to {
  opacity: 0;
}

/* Sheet */
.mobile-toc-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 401;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 1.25rem 1.25rem 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.1);
}

html.dark .mobile-toc-sheet {
  background: rgba(20, 20, 20, 0.96);
  box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.4);
}

/* Sheet transition */
.mobile-toc-sheet-enter-active,
.mobile-toc-sheet-leave-active {
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
.mobile-toc-sheet-enter-from,
.mobile-toc-sheet-leave-to {
  transform: translateY(100%);
}

/* Sheet header */
.mobile-toc-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0;
  flex-shrink: 0;
}

.mobile-toc-sheet-title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  color: rgba(0, 0, 0, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: calc(100% - 3rem);
}

html.dark .mobile-toc-sheet-title {
  color: rgba(255, 255, 255, 0.85);
}

.mobile-toc-sheet-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.4);
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

html.dark .mobile-toc-sheet-close {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.4);
}

.mobile-toc-sheet-duration {
  font-size: 0.78rem;
  color: rgba(120, 120, 120, 0.55);
  padding: 0.2rem 1.25rem 0;
  flex-shrink: 0;
}

html.dark .mobile-toc-sheet-duration {
  color: rgba(160, 160, 160, 0.45);
}

/* Sheet scrollable list */
.mobile-toc-sheet-list {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.75rem 1rem 1rem;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.mobile-toc-sheet-list::-webkit-scrollbar {
  display: none;
}

.mobile-toc-sheet-item {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  color: rgba(0, 0, 0, 0.55);
  font-size: 0.92rem;
  line-height: 1.4;
  padding: 0.55rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

html.dark .mobile-toc-sheet-item {
  color: rgba(255, 255, 255, 0.5);
}

.mobile-toc-sheet-item.is-h3 {
  padding-left: 1.75rem;
  font-size: 0.87rem;
}

.mobile-toc-sheet-item.is-active {
  color: rgba(0, 0, 0, 0.9);
  font-weight: 500;
  background: rgba(0, 0, 0, 0.04);
}

html.dark .mobile-toc-sheet-item.is-active {
  color: rgba(255, 255, 255, 0.88);
  background: rgba(255, 255, 255, 0.06);
}

.mobile-toc-sheet-item:active {
  background: rgba(0, 0, 0, 0.08);
}

html.dark .mobile-toc-sheet-item:active {
  background: rgba(255, 255, 255, 0.1);
}
</style>

<script setup lang="ts">
defineProps<{
  title: string
  duration?: string
}>()

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
const MIN_DOT_GAP = 24
const STEP_SIZE = 36

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

// Available height for the track area (matches CSS positioning)
const availableTrackHeight = computed(() => {
  // 80px top + 40px bottom + 52px title offset
  return Math.max(100, winHeight.value - 172)
})

// Natural height based on heading count with fixed step
const naturalTrackHeight = computed(() => {
  const count = headings.value.length
  if (count <= 1)
    return STEP_SIZE
  return (count - 1) * STEP_SIZE + DOT_HEIGHT
})

// Compact mode: enough space for fixed-step layout
const isCompact = computed(() => naturalTrackHeight.value <= availableTrackHeight.value)

// Effective track height used for rendering
const trackHeight = computed(() => {
  if (isCompact.value)
    return naturalTrackHeight.value
  return availableTrackHeight.value
})

// Map a document-space value to track-space
function docToTrack(val: number): number {
  return (val / docHeight.value) * trackHeight.value
}

// Dot positions: top edge of each dot segment
const dotPositions = computed(() => {
  if (!headings.value.length)
    return []

  // Compact mode: fixed step between dots
  if (isCompact.value) {
    return headings.value.map((_, i) => i * STEP_SIZE)
  }

  // Overflow mode: proportional mapping (existing logic)
  const raw = headings.value.map(h => docToTrack(h.offsetTop))
  const adjusted = [...raw]

  // Enforce minimum gap between consecutive dots
  for (let i = 1; i < adjusted.length; i++) {
    if (adjusted[i] - adjusted[i - 1] < MIN_DOT_GAP)
      adjusted[i] = adjusted[i - 1] + MIN_DOT_GAP
  }

  // If last dot pushed beyond track, scale everything back proportionally
  const lastPos = adjusted[adjusted.length - 1]
  const maxAllowed = trackHeight.value - DOT_HEIGHT
  if (lastPos > maxAllowed && lastPos > 0) {
    const scale = maxAllowed / lastPos
    for (let i = 0; i < adjusted.length; i++)
      adjusted[i] *= scale
  }

  return adjusted
})

// Line segments: the thin lines BETWEEN the dot gaps
const lineSegments = computed(() => {
  const segs: { y1: number, y2: number }[] = []
  const dots = dotPositions.value
  const th = trackHeight.value

  if (!dots.length) {
    segs.push({ y1: 0, y2: th })
    return segs
  }

  let prevEnd = 0
  for (const dotTop of dots) {
    const segEnd = dotTop - GAP_SIZE
    if (segEnd > prevEnd)
      segs.push({ y1: prevEnd, y2: segEnd })
    prevEnd = dotTop + DOT_HEIGHT + GAP_SIZE
  }

  // Final segment after last dot
  if (th > prevEnd)
    segs.push({ y1: prevEnd, y2: th })

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

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 40
    window.scrollTo({ top: y, behavior: 'smooth' })
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
  })
})
</script>

<template>
  <div
    v-if="headings.length"
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
</template>

<style>
/* ── Container ── */
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
    display: block;
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

/* ── Track area (holds SVG + labels) ── */
.scroll-toc-track {
  position: absolute;
  left: 0;
  top: 52px;
  width: 100%;
  opacity: 0;
  transform: translateX(-8px);
  pointer-events: none;
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.scroll-toc.is-awake .scroll-toc-track {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

.scroll-toc-anchor-hint {
  position: absolute;
  top: 0;
  left: 0;
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
  top: 0;
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
  position: absolute;
  top: 0;
  left: 4px;
  pointer-events: none;
  opacity: 0;
  transform: translateX(-4px);
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
}
</style>

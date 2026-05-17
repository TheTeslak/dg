<script setup lang="ts">
import type { ArticleAudio } from '~/types'

const props = defineProps<{
  audio: ArticleAudio
  articleTitle: string
  articleUpdatedAt: string
  articleImage?: string
  articleSlug?: string
}>()

const route = useRoute()

const root = ref<HTMLElement>()
const audioEl = ref<HTMLAudioElement>()

const currentTime = ref(0)
const durationSeconds = ref(0)
const playbackRate = ref(1)
const isPlaying = ref(false)
const isWaiting = ref(false)
const hasInteracted = ref(false)
const hasError = ref(false)
const isSticky = ref(false)
const isStickyClosed = ref(false)
const restoredPosition = ref(false)

const speedOptions = [1, 1.25, 1.5, 2] as const

let observer: IntersectionObserver | undefined
let lastSavedAt = 0

const title = computed(() => props.audio.title || props.articleTitle)
const downloadHref = computed(() => props.audio.downloadUrl || props.audio.url)
const storageKey = computed(() => `article-audio:${props.articleSlug || route.path}:${props.audio.url}`)
const showTimeline = computed(() => hasInteracted.value || currentTime.value > 0 || isPlaying.value)
const isStickyVisible = computed(() => isSticky.value && hasInteracted.value && !isStickyClosed.value && !hasError.value)
const progressPercent = computed(() => {
  if (!durationSeconds.value)
    return '0%'
  return `${Math.min(100, Math.max(0, (currentTime.value / durationSeconds.value) * 100))}%`
})
const displayDuration = computed(() => {
  return props.audio.duration || (durationSeconds.value ? formatTime(durationSeconds.value) : '')
})
const outdated = computed(() => {
  const sourceTime = parseDate(props.audio.sourceTextUpdatedAt)
  const articleTime = parseDate(props.articleUpdatedAt)
  return sourceTime != null && articleTime != null && sourceTime < articleTime
})

function parseDate(value?: string) {
  if (!value)
    return undefined
  const time = Date.parse(value)
  return Number.isNaN(time) ? undefined : time
}

function formatTime(value: number) {
  const total = Math.max(0, Math.floor(value))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  if (hours > 0)
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function clampTime(value: number) {
  const max = durationSeconds.value || audioEl.value?.duration || 0
  if (!Number.isFinite(max) || max <= 0)
    return Math.max(0, value)
  return Math.min(max, Math.max(0, value))
}

function restorePosition() {
  const audio = audioEl.value
  if (!audio || restoredPosition.value)
    return

  restoredPosition.value = true

  try {
    const saved = Number.parseFloat(localStorage.getItem(storageKey.value) || '')
    if (Number.isFinite(saved) && saved > 1 && (!durationSeconds.value || saved < durationSeconds.value - 3)) {
      audio.currentTime = saved
      currentTime.value = saved
    }
  }
  catch {
    // Storage can be unavailable in private contexts
  }
}

function savePosition() {
  if (!hasInteracted.value || !currentTime.value)
    return

  const now = Date.now()
  if (now - lastSavedAt < 2000)
    return

  lastSavedAt = now
  try {
    localStorage.setItem(storageKey.value, currentTime.value.toFixed(1))
  }
  catch {
    // Ignore storage failures; playback should keep working.
  }
}

function clearSavedPosition() {
  try {
    localStorage.removeItem(storageKey.value)
  }
  catch {}
}

function setMediaAction(action: MediaSessionAction, handler: MediaSessionActionHandler) {
  try {
    navigator.mediaSession.setActionHandler(action, handler)
  }
  catch {
    // Some browsers expose MediaSession partially.
  }
}

function updateMediaSessionMetadata() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined')
    return

  navigator.mediaSession.metadata = new MediaMetadata({
    title: title.value,
    artist: props.audio.artist || 'Teslak',
    artwork: props.articleImage
      ? [
          {
            src: props.articleImage,
            sizes: '512x512',
          },
        ]
      : undefined,
  })

  setMediaAction('play', () => {
    void play()
  })
  setMediaAction('pause', pause)
  setMediaAction('seekbackward', () => seekBy(-15))
  setMediaAction('seekforward', () => seekBy(15))
  setMediaAction('seekto', (details) => {
    if (typeof details.seekTime === 'number')
      seekTo(details.seekTime)
  })
}

function updateMediaSessionState() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator))
    return

  navigator.mediaSession.playbackState = isPlaying.value ? 'playing' : 'paused'

  if (!durationSeconds.value || !Number.isFinite(durationSeconds.value))
    return

  try {
    navigator.mediaSession.setPositionState({
      duration: durationSeconds.value,
      playbackRate: playbackRate.value,
      position: clampTime(currentTime.value),
    })
  }
  catch {}
}

async function play() {
  const audio = audioEl.value
  if (!audio)
    return

  hasInteracted.value = true
  isWaiting.value = true

  try {
    await audio.play()
  }
  catch {
    isWaiting.value = false
    isPlaying.value = false
  }
}

function pause() {
  audioEl.value?.pause()
}

function togglePlayback() {
  if (isPlaying.value)
    pause()
  else
    void play()
}

function seekTo(value: number) {
  const audio = audioEl.value
  if (!audio)
    return

  hasInteracted.value = true
  const nextTime = clampTime(value)
  audio.currentTime = nextTime
  currentTime.value = nextTime
  savePosition()
  updateMediaSessionState()
}

function seekBy(delta: number) {
  seekTo(currentTime.value + delta)
}

function cycleSpeed() {
  const index = speedOptions.indexOf(playbackRate.value as typeof speedOptions[number])
  playbackRate.value = speedOptions[(index + 1) % speedOptions.length]

  if (audioEl.value)
    audioEl.value.playbackRate = playbackRate.value

  updateMediaSessionState()
}

function onLoadedMetadata() {
  const audio = audioEl.value
  if (!audio)
    return

  if (Number.isFinite(audio.duration))
    durationSeconds.value = audio.duration

  audio.playbackRate = playbackRate.value
  restorePosition()
  updateMediaSessionMetadata()
  updateMediaSessionState()
}

function onTimeUpdate() {
  const audio = audioEl.value
  if (!audio)
    return

  currentTime.value = audio.currentTime
  if (Number.isFinite(audio.duration))
    durationSeconds.value = audio.duration

  savePosition()
  updateMediaSessionState()
}

function onPlaying() {
  isWaiting.value = false
  isPlaying.value = true
  hasInteracted.value = true
  updateMediaSessionState()
}

function onPause() {
  isWaiting.value = false
  isPlaying.value = false
  updateMediaSessionState()
}

function onEnded() {
  if (audioEl.value)
    audioEl.value.currentTime = 0

  isWaiting.value = false
  isPlaying.value = false
  hasInteracted.value = false
  currentTime.value = 0
  clearSavedPosition()
  updateMediaSessionState()
}

function onError() {
  hasError.value = true
  isWaiting.value = false
  isPlaying.value = false
}

function onProgressInput(event: Event) {
  const target = event.target as HTMLInputElement
  seekTo(Number.parseFloat(target.value))
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement
    && !!target.closest('a, button, input, textarea, select, [contenteditable="true"]')
}

function onKeydown(event: KeyboardEvent) {
  const isInteractive = isInteractiveTarget(event.target)

  if (isInteractive && (event.key === ' ' || event.key === 'Enter'))
    return

  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    togglePlayback()
  }
  else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    seekBy(-15)
  }
  else if (event.key === 'ArrowRight') {
    event.preventDefault()
    seekBy(15)
  }
}

function closeSticky() {
  isStickyClosed.value = true
}

onMounted(() => {
  const target = root.value
  if (!target || typeof IntersectionObserver === 'undefined')
    return

  observer = new IntersectionObserver(([entry]) => {
    const scrolledPastTop = entry.boundingClientRect.bottom <= 0
    isSticky.value = scrolledPastTop && !entry.isIntersecting
    if (!isSticky.value)
      isStickyClosed.value = false
  })
  observer.observe(target)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <p v-if="hasError" class="article-audio-error">
    {{ $t('article-audio-error') }}
  </p>

  <div
    v-else
    ref="root"
    class="article-audio"
    :class="{ 'is-active': showTimeline, 'is-playing': isPlaying }"
    role="group"
    tabindex="0"
    :aria-label="$t('article-audio-label')"
    @keydown="onKeydown"
  >
    <audio
      ref="audioEl"
      :src="audio.url"
      preload="metadata"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @playing="onPlaying"
      @pause="onPause"
      @ended="onEnded"
      @waiting="isWaiting = true"
      @error="onError"
    />

    <div class="article-audio-row">
      <button
        class="article-audio-icon-button article-audio-play"
        type="button"
        :aria-label="isPlaying ? $t('article-audio-pause') : $t('article-audio-play')"
        @click="togglePlayback"
      >
        <span v-if="isWaiting" class="article-audio-spinner" aria-hidden="true" />
        <span v-else :class="isPlaying ? 'i-ri-pause-fill' : 'i-ri-play-fill'" aria-hidden="true" />
      </button>

      <div class="article-audio-main">
        <Transition name="article-audio-fade" mode="out-in">
          <div v-if="!showTimeline" key="meta" class="article-audio-meta">
            <span class="article-audio-title">{{ title }}</span>
            <span v-if="displayDuration" class="article-audio-duration">{{ displayDuration }}</span>
          </div>
          <div v-else key="timeline" class="article-audio-timeline">
            <input
              class="article-audio-progress"
              type="range"
              min="0"
              :max="durationSeconds || 0"
              step="0.1"
              :value="currentTime"
              :style="{ '--article-audio-progress': progressPercent }"
              :aria-label="$t('article-audio-progress')"
              @input="onProgressInput"
            >
            <span class="article-audio-time">
              {{ formatTime(currentTime) }}<span v-if="durationSeconds"> / {{ formatTime(durationSeconds) }}</span>
            </span>
          </div>
        </Transition>
      </div>

      <div class="article-audio-controls" :class="{ 'is-visible': showTimeline }">
        <button
          class="article-audio-small-button"
          type="button"
          :aria-label="$t('article-audio-rewind')"
          @click="seekBy(-15)"
        >
          <span i-fluent-skip-back-15-20-regular aria-hidden="true" />
        </button>
        <button
          class="article-audio-small-button"
          type="button"
          :aria-label="$t('article-audio-forward')"
          @click="seekBy(15)"
        >
          <span i-fluent-skip-forward-15-20-regular aria-hidden="true" />
        </button>
        <button
          class="article-audio-speed-button"
          type="button"
          :aria-label="$t('article-audio-speed')"
          @click="cycleSpeed"
        >
          {{ playbackRate }}x
        </button>
      </div>

      <a
        class="article-audio-icon-button article-audio-download"
        :href="downloadHref"
        download
        :aria-label="$t('article-audio-download')"
      >
        <span i-ri-download-line aria-hidden="true" />
      </a>
    </div>

    <p v-if="outdated" class="article-audio-warning">
      <span i-ri-alert-line aria-hidden="true" />
      {{ $t('article-audio-outdated') }}
    </p>
  </div>

  <Teleport to="body">
    <Transition name="article-audio-sticky">
      <div
        v-if="isStickyVisible"
        class="article-audio article-audio-sticky is-active"
        :class="{ 'is-playing': isPlaying }"
        role="group"
        tabindex="0"
        :aria-label="$t('article-audio-label')"
        @keydown="onKeydown"
      >
        <div class="article-audio-row">
          <button
            class="article-audio-icon-button article-audio-play"
            type="button"
            :aria-label="isPlaying ? $t('article-audio-pause') : $t('article-audio-play')"
            @click="togglePlayback"
          >
            <span v-if="isWaiting" class="article-audio-spinner" aria-hidden="true" />
            <span v-else :class="isPlaying ? 'i-ri-pause-fill' : 'i-ri-play-fill'" aria-hidden="true" />
          </button>

          <div class="article-audio-main">
            <div class="article-audio-timeline">
              <input
                class="article-audio-progress"
                type="range"
                min="0"
                :max="durationSeconds || 0"
                step="0.1"
                :value="currentTime"
                :style="{ '--article-audio-progress': progressPercent }"
                :aria-label="$t('article-audio-progress')"
                @input="onProgressInput"
              >
              <span class="article-audio-time">
                {{ formatTime(currentTime) }}<span v-if="durationSeconds"> / {{ formatTime(durationSeconds) }}</span>
              </span>
            </div>
          </div>

          <div class="article-audio-controls is-visible">
            <button
              class="article-audio-small-button"
              type="button"
              :aria-label="$t('article-audio-rewind')"
              @click="seekBy(-15)"
            >
              <span i-fluent-skip-back-15-20-regular aria-hidden="true" />
            </button>
            <button
              class="article-audio-small-button"
              type="button"
              :aria-label="$t('article-audio-forward')"
              @click="seekBy(15)"
            >
              <span i-fluent-skip-forward-15-20-regular aria-hidden="true" />
            </button>
            <button
              class="article-audio-speed-button"
              type="button"
              :aria-label="$t('article-audio-speed')"
              @click="cycleSpeed"
            >
              {{ playbackRate }}x
            </button>
          </div>

          <a
            class="article-audio-icon-button article-audio-download"
            :href="downloadHref"
            download
            :aria-label="$t('article-audio-download')"
          >
            <span i-ri-download-line aria-hidden="true" />
          </a>

          <button
            class="article-audio-icon-button article-audio-close"
            type="button"
            :aria-label="$t('article-audio-close')"
            @click="closeSticky"
          >
            <span i-ri-close-line aria-hidden="true" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.article-audio {
  --article-audio-border: rgba(125, 125, 125, 0.2);
  --article-audio-bg: rgba(125, 125, 125, 0.055);
  --article-audio-control-bg: rgba(125, 125, 125, 0.11);
  --article-audio-control-bg-hover: rgba(125, 125, 125, 0.18);
  --article-audio-text-muted: rgba(125, 125, 125, 0.8);
  margin: 1.5rem 0 0;
  border: 1px solid var(--article-audio-border);
  border-radius: 8px;
  background: var(--article-audio-bg);
  outline: none;
  transition:
    border-color 240ms ease,
    background 240ms ease,
    box-shadow 240ms ease,
    transform 300ms ease,
    padding 300ms ease;
}

.article-audio:focus-visible,
.article-audio button:focus-visible,
.article-audio a:focus-visible,
.article-audio input:focus-visible {
  outline: 2px solid rgba(125, 125, 125, 0.45);
  outline-offset: 3px;
}

.article-audio-row {
  min-height: 4rem;
  padding: 0.65rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  transition:
    min-height 300ms ease,
    padding 300ms ease,
    gap 300ms ease;
}

.article-audio audio {
  display: none;
}

.article-audio-icon-button,
.article-audio-small-button,
.article-audio-speed-button {
  border: 0;
  color: inherit;
  cursor: pointer;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--article-audio-control-bg);
  transition:
    background 200ms ease,
    opacity 240ms ease,
    transform 180ms ease;
}

.article-audio-icon-button:hover,
.article-audio-small-button:hover,
.article-audio-speed-button:hover {
  background: var(--article-audio-control-bg-hover);
  transform: scale(1.07);
}

.article-audio-icon-button:active,
.article-audio-small-button:active,
.article-audio-speed-button:active {
  background: var(--article-audio-control-bg-hover);
  transform: scale(0.93);
  transition-duration: 80ms;
}

.article-audio-icon-button {
  width: 2.45rem;
  height: 2.45rem;
  border-radius: 999px;
  font-size: 1.1rem;
  text-decoration: none !important;
  border-bottom: none !important;
}

.article-audio-play {
  font-size: 1.2rem;
}

.article-audio-small-button {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  font-size: 0.95rem;
}

.article-audio-speed-button {
  min-width: 2.8rem;
  height: 2rem;
  padding: 0 0.55rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1;
}

.article-audio-main {
  min-width: 0;
  flex: 1 1 auto;
}

.article-audio-meta,
.article-audio-timeline {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.article-audio-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.article-audio-duration,
.article-audio-time {
  flex: none;
  color: var(--article-audio-text-muted);
  font-size: 0.78rem;
  line-height: 1;
  white-space: nowrap;
}

.article-audio-progress {
  --article-audio-progress: 0%;
  width: 100%;
  min-width: 3rem;
  height: 1.4rem;
  margin: 0;
  cursor: pointer;
  appearance: none;
  background: transparent;
}

.article-audio-progress::-webkit-slider-runnable-track {
  height: 0.22rem;
  border-radius: 999px;
  background:
    linear-gradient(currentColor, currentColor) 0 / var(--article-audio-progress) 100% no-repeat,
    rgba(125, 125, 125, 0.2);
}

.article-audio-progress::-moz-range-track {
  height: 0.22rem;
  border-radius: 999px;
  background: rgba(125, 125, 125, 0.2);
}

.article-audio-progress::-moz-range-progress {
  height: 0.22rem;
  border-radius: 999px;
  background: currentColor;
}

.article-audio-progress::-webkit-slider-thumb {
  width: 0.78rem;
  height: 0.78rem;
  margin-top: -0.28rem;
  border: 0;
  border-radius: 999px;
  appearance: none;
  background: currentColor;
  transition: transform 200ms ease;
}

.article-audio-progress::-moz-range-thumb {
  width: 0.78rem;
  height: 0.78rem;
  border: 0;
  border-radius: 999px;
  background: currentColor;
  transition: transform 200ms ease;
}

.article-audio-progress:hover::-webkit-slider-thumb {
  transform: scale(1.15);
}

.article-audio-progress:hover::-moz-range-thumb {
  transform: scale(1.15);
}

.article-audio-controls {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0;
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-0.4rem);
  transition:
    max-width 260ms ease,
    gap 260ms ease,
    opacity 260ms ease,
    transform 260ms ease;
}

.article-audio-controls.is-visible {
  gap: 0.35rem;
  max-width: 9rem;
  opacity: 1;
  overflow: visible;
  pointer-events: auto;
  transform: translateX(0);
}

.article-audio-warning {
  margin: 0.35rem 0.65rem 0.55rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--fg-light, #888);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 1rem;
  line-height: 1.5;
}

.article-audio-warning span[i-ri-alert-line] {
  font-size: 0.9em;
  opacity: 0.8;
}

.article-audio-error {
  margin: 0.55rem 0 0;
  color: var(--article-audio-text-muted);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.84rem;
  border: 1px solid rgba(125, 125, 125, 0.18);
  border-radius: 8px;
  padding: 0.7rem 0.85rem;
}

.article-audio-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(125, 125, 125, 0.35);
  border-top-color: currentColor;
  border-radius: 999px;
  animation: article-audio-spin 800ms linear infinite;
}

.article-audio-fade-enter-active,
.article-audio-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.article-audio-fade-enter-from,
.article-audio-fade-leave-to {
  opacity: 0;
  transform: translateY(0.2rem);
}

.article-audio-sticky {
  position: fixed;
  top: 0;
  left: 50%;
  z-index: 350;
  width: min(100vw - 1.5rem, 48rem);
  margin: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-left-radius: 1.5rem;
  border-bottom-right-radius: 1.5rem;
  backdrop-filter: blur(16px);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.08);
  transform: translateX(-50%);
}

.article-audio-sticky .article-audio-row {
  min-height: 3rem;
  padding: 0.45rem;
}

.article-audio-sticky .article-audio-icon-button {
  width: 2.1rem;
  height: 2.1rem;
}

.article-audio-sticky-enter-active,
.article-audio-sticky-leave-active {
  transition:
    opacity 260ms ease,
    transform 300ms ease;
}

.article-audio-sticky-enter-from,
.article-audio-sticky-leave-to {
  opacity: 0;
  transform: translate(-50%, -100%);
}

@keyframes article-audio-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .article-audio-row {
    min-height: 3.5rem;
    padding: 0.5rem;
    gap: 0.38rem;
  }

  .article-audio-icon-button {
    width: 2.15rem;
    height: 2.15rem;
  }

  .article-audio-small-button {
    width: 1.9rem;
    height: 1.9rem;
  }

  .article-audio-speed-button {
    min-width: 2.45rem;
    padding: 0 0.4rem;
  }

  .article-audio-controls {
    max-width: 0;
  }

  .article-audio-controls.is-visible {
    gap: 0.25rem;
    max-width: 8rem;
  }

  .article-audio-time {
    display: none;
  }

  .article-audio-duration {
    max-width: 4.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .article-audio-sticky {
    width: 100vw;
  }
}

@media (prefers-reduced-motion: reduce) {
  .article-audio,
  .article-audio-row,
  .article-audio-controls,
  .article-audio-icon-button,
  .article-audio-small-button,
  .article-audio-speed-button,
  .article-audio-fade-enter-active,
  .article-audio-fade-leave-active,
  .article-audio-sticky-enter-active,
  .article-audio-sticky-leave-active {
    transition: none;
  }

  .article-audio-spinner {
    animation: none;
  }
}
</style>

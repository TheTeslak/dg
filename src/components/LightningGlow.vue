<script setup lang="ts">
import type { LightningEngine } from './lightning/engine'
import { useElementVisibility, usePreferredReducedMotion } from '@vueuse/core'

type EngineStatus = 'idle' | 'loading' | 'ready' | 'failed'

const containerRef = useTemplateRef<HTMLDivElement>('container')
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const isVisible = useElementVisibility(containerRef)
const preferredMotion = usePreferredReducedMotion()

const status = shallowRef<EngineStatus>('idle')
const shouldShowFallback = computed(() => preferredMotion.value === 'reduce' || status.value === 'failed')

let engine: LightningEngine | null = null
let initToken = 0

async function initEngine() {
  if (status.value === 'loading' || status.value === 'ready' || shouldShowFallback.value)
    return
  if (!canvasRef.value || !containerRef.value)
    return

  const currentToken = ++initToken
  status.value = 'loading'

  try {
    const { createLightningEngine } = await import('./lightning/engine')
    if (currentToken !== initToken || shouldShowFallback.value || !canvasRef.value || !containerRef.value) {
      if (status.value === 'loading')
        status.value = 'idle'
      return
    }

    engine = createLightningEngine(canvasRef.value, containerRef.value, () => {
      status.value = 'failed'
      engine = null
    })
    status.value = 'ready'
    if (isVisible.value) {
      engine.start()
    }
  }
  catch (error) {
    console.error('Failed to initialize LightningGlow simulation:', error)
    status.value = 'failed'
    engine = null
  }
}

watch(isVisible, (visible) => {
  if (shouldShowFallback.value)
    return
  if (visible) {
    if (status.value === 'idle')
      initEngine()
    else if (status.value === 'ready')
      engine?.start()
  }
  else if (status.value === 'ready') {
    engine?.pause()
  }
})

watch(preferredMotion, async (motion) => {
  if (motion === 'reduce') {
    initToken++
    if (engine) {
      engine.destroy()
      engine = null
    }
    if (status.value !== 'failed')
      status.value = 'idle'
  }
  else {
    await nextTick()
    if (isVisible.value && status.value === 'idle') {
      initEngine()
    }
  }
})

onUnmounted(() => {
  initToken++
  if (engine) {
    engine.destroy()
    engine = null
  }
  status.value = 'idle'
})
</script>

<template>
  <div
    ref="container"
    class="my-8 sm:my-10 w-full max-w-[520px] mx-auto select-none"
  >
    <div class="relative w-full aspect-[4/3] sm:aspect-[16/10] overflow-hidden flex items-center justify-center">
      <div v-if="shouldShowFallback" class="w-full h-full flex items-center justify-center p-4">
        <svg
          viewBox="0 0 460 700"
          class="h-full max-h-[260px] w-auto drop-shadow-[0_0_24px_rgba(0,199,255,0.45)]"
          role="img"
          aria-label="Lightning bolt"
        >
          <defs>
            <linearGradient id="lightning-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00c7ff" />
              <stop offset="100%" stop-color="#1e59ff" />
            </linearGradient>
          </defs>
          <polygon
            points="143.093,700 201.004,374.419 0,374.419 316.907,0 258.996,325.581 460,325.581"
            fill="url(#lightning-glow-grad)"
          />
        </svg>
      </div>
      <canvas
        v-else
        ref="canvas"
        class="w-full h-full block touch-pan-y"
        aria-label="Interactive particle lightning bolt"
        role="img"
      />
    </div>
  </div>
</template>

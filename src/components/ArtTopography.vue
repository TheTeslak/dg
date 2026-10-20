<script setup lang="ts">
import { useEventListener, useRafFn, useWindowSize } from '@vueuse/core'
import { createNoise3D } from 'simplex-noise'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

const el = ref<HTMLCanvasElement | null>(null)
const size = reactive(useWindowSize())
const noise3d = createNoise3D()

function initCanvas(canvas: HTMLCanvasElement, width = 400, height = 400) {
  const ctx = canvas.getContext('2d')!
  const dpr = window.devicePixelRatio || 1
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  canvas.width = dpr * width
  canvas.height = dpr * height
  ctx.scale(dpr, dpr)
  return { ctx, dpr }
}

onMounted(() => {
  const canvas = el.value!
  const { ctx } = initCanvas(canvas, size.width, size.height)

  let time = 0
  const SPACING = 25
  const NOISE_SCALE = 0.003
  const AMPLITUDE = 120

  const frame = () => {
    ctx.clearRect(0, 0, size.width, size.height)
    time += 0.002

    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(136, 136, 136, 0.2)'

    for (let y = 0; y <= size.height + AMPLITUDE; y += SPACING) {
      ctx.beginPath()
      for (let x = 0; x <= size.width + 10; x += 10) {
        const n = noise3d(x * NOISE_SCALE, y * NOISE_SCALE, time)
        const displacedY = y + n * AMPLITUDE

        if (x === 0)
          ctx.moveTo(x, displacedY)
        else ctx.lineTo(x, displacedY)
      }
      ctx.stroke()
    }
  }

  const controls = useRafFn(frame)

  useEventListener(window, 'resize', () => {
    initCanvas(canvas, size.width, size.height)
  })

  onUnmounted(() => {
    controls.pause()
  })
})

const mask = computed(() => 'radial-gradient(circle, transparent, black);')
</script>

<template>
  <div
    class="fixed top-0 bottom-0 left-0 right-0 pointer-events-none print:hidden"
    style="z-index: -1"
    :style="`mask-image: ${mask};--webkit-mask-image: ${mask};`"
  >
    <canvas ref="el" width="400" height="400" aria-hidden="true" />
  </div>
</template>

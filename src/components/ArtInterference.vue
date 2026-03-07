<script setup lang="ts">
import { useEventListener, useRafFn, useWindowSize } from '@vueuse/core'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

const el = ref<HTMLCanvasElement | null>(null)
const size = reactive(useWindowSize())

interface Drop {
  x: number
  y: number
  radius: number
  maxRadius: number
  speed: number
}

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

  const drops: Drop[] = []

  const frame = () => {
    ctx.clearRect(0, 0, size.width, size.height)

    if (Math.random() < 0.12) {
      drops.push({
        x: Math.random() * size.width,
        y: Math.random() * size.height,
        radius: 0,
        maxRadius: Math.random() * 250 + 100,
        speed: Math.random() * 0.8 + 0.4,
      })
    }

    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i]
      d.radius += d.speed

      const life = 1 - (d.radius / d.maxRadius)
      if (life <= 0) {
        drops.splice(i, 1)
        continue
      }

      ctx.lineWidth = 1

      ctx.beginPath()
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(136, 136, 136, ${life * 0.5})`
      ctx.stroke()

      if (d.radius > 20) {
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.radius - 20, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(136, 136, 136, ${life * 0.25})`
        ctx.stroke()
      }
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
    <canvas ref="el" width="400" height="400" />
  </div>
</template>

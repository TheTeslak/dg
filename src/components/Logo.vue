<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

const path = useTemplateRef<SVGPathElement>('path')
const preferredMotion = usePreferredReducedMotion()
let animation: Animation | undefined

function stopAnimation() {
  animation?.cancel()
  animation = undefined
}

function replay() {
  if (!path.value || preferredMotion.value === 'reduce' || animation?.playState === 'running')
    return

  stopAnimation()
  const current = path.value.animate(
    [
      { strokeDashoffset: '0', offset: 0, easing: 'ease-in' },
      { strokeDashoffset: '1', offset: 0.5, easing: 'ease-out' },
      { strokeDashoffset: '0', offset: 1 },
    ],
    { duration: 1200, easing: 'linear', iterations: 1 },
  )
  animation = current
  current.onfinish = () => {
    if (animation === current)
      animation = undefined
  }
}

watch(preferredMotion, (value) => {
  if (value === 'reduce')
    stopAnimation()
})

onMounted(replay)
onBeforeUnmount(stopAnimation)

defineExpose({ replay })
</script>

<template>
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
    <title>{{ $t('a11y-site-logo') }}</title>
    <mask id="mask0_1167_476" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="12" y="11" width="52" height="78">
      <path
        d="M29.3093 85L35.1004 52.4419H15L46.6907 15L40.8996 47.5581H61L29.3093 85Z"
        fill="white"
        stroke="white"
        stroke-width="2"
      />
    </mask>
    <g mask="url(#mask0_1167_476)">
      <path
        ref="path"
        class="path1"
        pathLength="1"
        d="M59.5 47.5581H40.8996L46.6907 15L15 52.4419H35.1004L29.3093 85L61 47.5581H51.5"
        stroke="black"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </g>
  </svg>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce), print {
  .path1 {
    stroke-dashoffset: 0 !important;
    stroke-dasharray: none !important;
  }
}
.path1 {
  stroke-dashoffset: 0;
  stroke-dasharray: 1;
  stroke: #303030;
}
.dark .path1 {
  stroke: #fdfdfd;
}
</style>

<script setup lang="ts">
import type { Photo } from '../../../photos/data'
import { blurhashToGradientCssObject } from '@unpic/placeholder'

withDefaults(defineProps<{
  photos: Photo[]
  view?: 'cover' | 'contain'
}>(), {
  view: 'cover',
})

const loadedPhotos = reactive<Record<string, boolean>>({})

function updateCoverScale(el: HTMLImageElement) {
  if (!el || !el.naturalWidth || !el.naturalHeight)
    return
  const aspect = el.naturalWidth / el.naturalHeight
  if (Number.isFinite(aspect) && aspect > 0) {
    const scale = aspect >= 1 ? aspect : 1 / aspect
    el.style.setProperty('--cover-scale', String(Math.round(scale * 10000) / 10000))
  }
}

function onImageLoad(e: Event, name: string) {
  const img = e.target as HTMLImageElement
  updateCoverScale(img)
  loadedPhotos[name] = true
}

const gridRef = useTemplateRef<HTMLElement>('gridRef')

onMounted(() => {
  nextTick(() => {
    if (!gridRef.value)
      return
    const images = gridRef.value.querySelectorAll<HTMLImageElement>('img.photo-img')
    images.forEach((img) => {
      const name = img.dataset.photoName
      if (img.complete && img.naturalWidth) {
        updateCoverScale(img)
        if (name)
          loadedPhotos[name] = true
      }
    })
  })
})
</script>

<template>
  <div
    ref="gridRef"
    class="photos grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    max-w-500 mx-auto
  >
    <div v-for="photo, idx in photos" :key="photo.name" :lang="photo.lang">
      <div
        class="photo-hover relative aspect-square overflow-hidden flex items-center justify-center bg-hex-8881 select-none"
      >
        <div
          v-if="photo.blurhash && !loadedPhotos[photo.name]"
          class="photo-blurhash absolute inset-0 pointer-events-none z-0 transition-opacity duration-300 ease-out"
          :style="blurhashToGradientCssObject(photo.blurhash) as any"
        />
        <img
          :src="photo.url"
          :alt="photo.text ?? ''"
          :data-photo-index="idx"
          :data-photo-name="photo.name"
          loading="lazy"
          class="photo-img block max-w-full max-h-full object-contain z-1 cursor-pointer"
          :class="[
            view === 'cover' ? 'photo-view-cover' : 'photo-view-contain',
            loadedPhotos[photo.name] ? 'is-loaded' : '',
          ]"
          @load="onImageLoad($event, photo.name)"
        >
      </div>
    </div>
  </div>
</template>

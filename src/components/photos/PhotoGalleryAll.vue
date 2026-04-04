<script setup lang="ts">
import raw from '../../../photos/data'
import { galleryView } from '../../logics'

const props = defineProps<{
  limit?: number
}>()

const photos = computed(() => {
  if (props.limit)
    return raw.slice(0, props.limit)
  return raw
})
</script>

<template>
  <div class="flex justify-center mb-6 relative z-10 slide-enter">
    <button
      class="flex items-center gap-2 px-4 py-2 rounded-full op40 hover:op80 transition-all duration-300 outline-none select-none"
      @click="galleryView = galleryView === 'cover' ? 'contain' : 'cover'"
    >
      <div class="text-lg" :class="galleryView === 'cover' ? 'i-ri-layout-masonry-line' : 'i-ri-grid-line'" />
      {{ galleryView === 'cover' ? $t('photos-view-contain') : $t('photos-view-cover') }}
    </button>
  </div>
  <PhotoGrid :photos="photos" :view="galleryView" />
</template>

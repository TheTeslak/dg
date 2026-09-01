<script setup lang="ts">
import raw from '../../../photos/data'
import { galleryView, toggleGalleryView } from '../../logics'

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
  <div>
    <div class="flex justify-center mb-6 relative z-10 slide-enter">
      <button
        class="group flex items-center gap-2 px-4 py-2 rounded-full op40 hover:op80 transition-all duration-300 outline-none select-none cursor-pointer"
        :aria-label="galleryView === 'cover' ? $t('photos-view-contain') : $t('photos-view-cover')"
        @click="toggleGalleryView"
      >
        <div
          class="text-lg transition-transform duration-300 ease-out"
          :class="galleryView === 'cover' ? 'i-ri-layout-masonry-line rotate-0' : 'i-ri-grid-line rotate-180'"
        />
        <span class="transition-opacity duration-200">
          {{ galleryView === 'cover' ? $t('photos-view-contain') : $t('photos-view-cover') }}
        </span>
      </button>
    </div>
    <PhotoGrid :photos="photos" :view="galleryView" />
  </div>
</template>

<script setup lang="ts">
import type { Photo } from '../../../photos/data'
import raw from '../../../photos/data'

const props = withDefaults(defineProps<{
  ids?: string[] | string
  mode?: 'slide' | 'grid'
  view?: 'cover' | 'contain'
  limit?: number
}>(), {
  mode: 'grid',
  view: 'cover',
})

const ids = computed(() => {
  if (!props.ids)
    return []
  if (Array.isArray(props.ids))
    return props.ids.map(i => i.trim()).filter(Boolean)
  return props.ids.split(',').map(i => i.trim()).filter(Boolean)
})

const photos = computed<Photo[]>(() => {
  if (ids.value.length) {
    const selected: Photo[] = []
    const missing: string[] = []

    for (const id of ids.value) {
      const found = raw.find(photo => photo.name === id || photo.url.includes(id))
      if (found)
        selected.push(found)
      else
        missing.push(id)
    }

    if (missing.length) {
      console.warn(`[PhotoShowcase] Missing photo ids: ${missing.join(', ')}`)
    }

    return selected
  }

  if (props.limit)
    return raw.slice(0, props.limit)

  return raw
})
</script>

<template>
  <PhotoSlide
    v-if="mode === 'slide'"
    :photos="photos"
  />
  <PhotoGrid
    v-else
    :photos="photos"
    :view="view"
  />
</template>

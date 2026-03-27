<script setup lang="ts">
defineProps<{
  id: string
  noScale?: boolean
}>()
</script>

<template>
  <div>
    <iframe
      class="aspect-16/9 w-full rounded-xl shadow lg:max-w-none !my-[1.75em]"
      :class="noScale ? '' : 'lg:w-[120%] lg:-mx-[10%]'"
      :src="`https://www.youtube-nocookie.com/embed/${id}`"
      title="YouTube video player"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
    />
  </div>
</template>

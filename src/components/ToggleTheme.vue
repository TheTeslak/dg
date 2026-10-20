<script setup lang='ts'>
import { toggleDark } from '~/logics'
</script>

<template>
  <button class="select-none" :title="$t('action-toggle-theme')" :aria-label="$t('action-toggle-theme')" @click="toggleDark">
    <div i-ri-sun-line dark:i-ri-moon-line />
  </button>
</template>

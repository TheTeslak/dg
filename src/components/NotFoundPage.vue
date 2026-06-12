<script setup lang="ts">
import { getLocaleFromPath } from '~/logics/i18n-path'

const route = useRoute()
const locale = computed(() => getLocaleFromPath(route.path))
</script>

<template>
  <div class="prose m-auto mt-10 text-center">
    <h1 class="text-5xl font-bold">
      404
    </h1>
    <p op50>
      {{ $t('page-not-found') }}
    </p>
    <div mt-5>
      <RouterLink :to="`/${locale}`" btn-gray>
        {{ $t('action-go-home') }}
      </RouterLink>
    </div>
  </div>
</template>

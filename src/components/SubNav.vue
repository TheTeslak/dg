<script setup lang="ts">
import { useRoute } from 'vue-router'
import { onlyLanguage } from '../logics'
import { computed } from 'vue'

const inactiveStyle = 'opacity-20 hover:opacity-50'
const activeStyle = 'opacity-100 underline'

const route = useRoute()

const currentLocale = computed(() => {
  const pathLocale = route.path.split('/')[1]
  return ['en', 'ru', 'es'].includes(pathLocale) ? pathLocale : 'en'
})
</script>

<template>
  <div class="prose m-auto mb-8 select-none animate-none! op100!">
    <button flex="~ gap1" items-center mb2 op30 text-sm @click="onlyLanguage = !onlyLanguage">
      <div :class="onlyLanguage ? 'i-carbon-checkbox-checked' : 'i-carbon-checkbox'" />
      {{ $t('blog-only-lang', { lang: currentLocale.toUpperCase() }) }}
    </button>

    <div mb-0 flex="~ col gap-1 sm:row sm:gap-3 wrap" text-3xl>
      <RouterLink :to="`/${currentLocale}/notes`" class="!border-none" :class="route.path.includes('/notes') ? activeStyle : inactiveStyle">
        {{ $t('nav-notes') }}
      </RouterLink>
      <RouterLink :to="`/${currentLocale}/articles`" class="!border-none" :class="route.path.includes('/articles') ? activeStyle : inactiveStyle">
        {{ $t('nav-articles') }}
      </RouterLink>
      <!-- hidden tabs (kept for future use) -->
      <RouterLink v-if="false" :to="`/${currentLocale}/talks`" class="!border-none" :class="route.path.includes('/talks') ? activeStyle : inactiveStyle">
        {{ $t('nav-talks') }}
      </RouterLink>
      <RouterLink v-if="false" :to="`/${currentLocale}/podcasts`" class="!border-none" :class="route.path.includes('/podcasts') ? activeStyle : inactiveStyle">
        {{ $t('nav-podcasts') }}
      </RouterLink>
      <RouterLink v-if="false" :to="`/${currentLocale}/streams`" class="!border-none" :class="route.path.includes('/streams') ? activeStyle : inactiveStyle">
        {{ $t('nav-streams') }}
      </RouterLink>
    </div>
  </div>
</template>
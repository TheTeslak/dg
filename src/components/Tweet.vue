<script setup lang="ts">
import { isDark } from '../logics'

defineProps<{
  conversation?: 'none'
}>()

interface TwitterWidgetsWindow extends Window {
  __twitterWidgetsPromise?: Promise<void>
}

const TWITTER_SCRIPT_ID = 'twitter-widgets-script'
const TWITTER_SCRIPT_URL = 'https://platform.twitter.com/widgets.js'

function loadTwitterWidgets() {
  if (typeof window === 'undefined')
    return Promise.resolve()

  const twitterWindow = window as TwitterWidgetsWindow
  if (twitterWindow.twttr?.widgets)
    return Promise.resolve()
  if (twitterWindow.__twitterWidgetsPromise)
    return twitterWindow.__twitterWidgetsPromise

  twitterWindow.__twitterWidgetsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(TWITTER_SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Twitter widgets')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = TWITTER_SCRIPT_ID
    script.async = true
    script.src = TWITTER_SCRIPT_URL
    script.charset = 'utf-8'
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      resolve()
    }, { once: true })
    script.addEventListener('error', () => {
      twitterWindow.__twitterWidgetsPromise = undefined
      script.remove()
      reject(new Error('Failed to load Twitter widgets'))
    }, { once: true })

    document.head.appendChild(script)
  })

  return twitterWindow.__twitterWidgetsPromise
}

const tweet = ref<HTMLElement>()

onMounted(async () => {
  try {
    await loadTwitterWidgets()
    window.twttr?.widgets?.load(tweet.value)
  }
  catch (error) {
    console.error('[Tweet] Failed to load Twitter widgets:', error)
  }
})
</script>

<template>
  <div ref="tweet" class="flex items-center justify-center">
    <blockquote
      class="twitter-tweet"
      :data-theme="isDark ? 'dark' : 'light'"
      :data-conversation="conversation ? conversation : undefined"
    >
      <slot />
    </blockquote>
  </div>
</template>

<style>
.twitter-tweet iframe {
  clip-path: inset(0 round 12px) !important;
}
</style>

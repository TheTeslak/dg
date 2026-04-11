<script setup lang="ts">
import { isLightboxOpen } from '~/logics'
import { getLocaleFromPath } from '~/logics/i18n-path'
import { useKeyboardNav } from '~/logics/keyboard-nav'

const route = useRoute()

useKeyboardNav()

const currentLocale = computed(() => getLocaleFromPath(route.path))
watch(currentLocale, (locale) => {
  if (typeof document !== 'undefined')
    document.documentElement.lang = locale
}, { immediate: true })

const imageModel = ref<HTMLImageElement>()
const imageAlt = ref<string>()
const imageClasses = ref<string>()
const lightboxRef = ref<HTMLElement>()

// For restoring focus on close
const triggerElement = ref<HTMLElement>()

watch(imageModel, (img) => {
  isLightboxOpen.value = !!img

  if (img) {
    nextTick(() => lightboxRef.value?.focus())
  }
  else if (triggerElement.value) {
    nextTick(() => {
      triggerElement.value?.focus()
      triggerElement.value = undefined
    })
  }
})

function getRectCenter(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

function getLightboxClasses(img: HTMLImageElement): string {
  return img.className
    .split(/\s+/)
    .filter(cls => cls.includes('filter'))
    .join(' ')
}

function setImageModel(img: HTMLImageElement) {
  imageModel.value = img
  imageClasses.value = getLightboxClasses(img)

  // Show caption only for gallery/carousel photos, not standalone article images
  const isGalleryPhoto = img.dataset.photoIndex != null
    || !!img.closest('.photos')

  if (isGalleryPhoto) {
    imageAlt.value = img.alt
    const figure = img.closest('figure')
    if (figure) {
      const caption = figure.querySelector('figcaption')
      if (caption?.textContent)
        imageAlt.value ||= caption.textContent
    }
  }
  else {
    imageAlt.value = undefined
  }
}

function closeLightbox() {
  imageModel.value = undefined
}

useEventListener('click', async (e) => {
  const path = Array.from(e.composedPath())
  const first = path[0] as HTMLImageElement
  if (!(first instanceof HTMLElement))
    return
  if (first.tagName !== 'IMG')
    return
  if (first.classList.contains('no-preview'))
    return
  if (path.some(el => el instanceof HTMLElement && ['A', 'BUTTON'].includes(el.tagName)))
    return
  if (!path.some(el => el instanceof HTMLElement && (el.classList.contains('prose') || el.classList.contains('photos'))))
    return

  // Do not open image when they are moving. Mainly for mobile to avoid conflict with hovering behavior.
  const pos = getRectCenter(first)
  await new Promise(resolve => setTimeout(resolve, 50))
  const newPos = getRectCenter(first)
  if (Math.abs(pos.x - newPos.x) > 1 || Math.abs(pos.y - newPos.y) > 1)
    return

  triggerElement.value = first
  setImageModel(first)
})

onKeyStroke('ArrowRight', (e) => {
  if (!imageModel.value || imageModel.value.dataset.photoIndex == null)
    return

  const index = Number.parseInt(imageModel.value.dataset.photoIndex)
  const nextIndex = index + 1
  const nextImg = document.querySelector(`img[data-photo-index="${nextIndex}"]`) as HTMLImageElement | null
  if (nextImg) {
    setImageModel(nextImg)
    e.preventDefault()
  }
})

onKeyStroke('ArrowLeft', (e) => {
  if (!imageModel.value || imageModel.value.dataset.photoIndex == null)
    return

  const index = Number.parseInt(imageModel.value.dataset.photoIndex)
  const prevIndex = index - 1
  const prevImg = document.querySelector(`img[data-photo-index="${prevIndex}"]`) as HTMLImageElement | null
  if (prevImg) {
    setImageModel(prevImg)
    e.preventDefault()
  }
})

onKeyStroke('Escape', (e) => {
  if (imageModel.value) {
    closeLightbox()
    e.preventDefault()
  }
})

// Focus trap (WCAG 2.1.2)
function handleLightboxKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab')
    return
  if (!lightboxRef.value)
    return

  const focusable = lightboxRef.value.querySelectorAll<HTMLElement>(
    'button, [href], [tabindex]:not([tabindex="-1"])',
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (!first) {
    // No focusable children — keep focus on the overlay itself
    e.preventDefault()
    return
  }

  if (e.shiftKey) {
    if (document.activeElement === first || document.activeElement === lightboxRef.value) {
      e.preventDefault()
      last.focus()
    }
  }
  else {
    if (document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

onMounted(() => {
  // eslint-disable-next-line no-console
  console.log(
    '%c👁 if you gaze long into an abyss, the abyss also gazes at you',
    'color: #888; font-size: 14px; font-family: monospace;',
  )
})
</script>

<template>
  <a href="#main-content" class="skip-link">Skip to content</a>
  <NavBar />
  <main id="main-content" class="px-7 py-10 of-x-hidden" tabindex="-1" role="main">
    <RouterView />
    <Footer :key="route.path" />
  </main>
  <Transition name="fade">
    <div
      v-if="imageModel"
      ref="lightboxRef"
      role="dialog"
      aria-modal="true"
      :aria-label="imageAlt || imageModel.alt || 'Image preview'"
      tabindex="-1"
      fixed top-0 left-0 right-0 bottom-0 z-500 backdrop-blur-7
      @click="closeLightbox"
      @keydown="handleLightboxKeydown"
    >
      <div absolute top-0 left-0 right-0 bottom-0 bg-black:50 z--1 />
      <img :src="imageModel.src" :alt="imageModel.alt" :class="imageClasses" max-w-screen max-h-screen w-full h-full object-contain>
      <div v-if="imageAlt" text-white bg-black:50 absolute right-5 bottom-5 px2 py1 flex justify-center items-center>
        {{ imageAlt }}
      </div>
      <button
        aria-label="Close image preview"
        absolute top-4 right-4 z-501
        w-10 h-10 flex items-center justify-center
        rounded-full bg-black:50 text-white
        border-0 cursor-pointer
        opacity-60 hover:opacity-100 transition-opacity
        @click.stop="closeLightbox"
      >
        <div i-ri:close-line text-xl />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.skip-link {
  position: absolute;
  top: -100px;
  left: 1.5rem;
  z-index: 1000;
  padding: 0.5rem 1rem;
  background-color: var(--c-bg);
  color: inherit;
  border: 1px solid rgba(125, 125, 125, 0.4);
  border-radius: 0.25rem;
  font-weight: bold;
  text-decoration: none;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 1.5rem;
  outline: 2px solid rgba(125, 125, 125, 0.6);
  outline-offset: 4px;
}
</style>

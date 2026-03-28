import { onKeyStroke, useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getLocaleFromPath } from './i18n-path'

/**
 * Available art styles for background decoration.
 * Order defines the cycling sequence for ↑/↓ keys.
 */
export const artStyles = ['plum', 'dots', 'cellular', 'topography', 'interference'] as const
export type ArtStyle = typeof artStyles[number]

/**
 * Global reactive override for the art background.
 * When set, WrapperPost uses this instead of frontmatter `art`.
 * Persisted in localStorage so the choice survives page transitions.
 */
export const artOverride = useLocalStorage<string>('dg-art-override', '')

/**
 * Top-level nav paths (relative to locale prefix).
 * Only on these pages do ←/→ keys trigger navigation.
 */
const navSuffixes = ['', '/notes', '/projects', '/photos']

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement))
    return false
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
    return true
  if (target.isContentEditable)
    return true
  return false
}

function isImageLightboxOpen(): boolean {
  // App.vue renders backdrop-blur-7 on the lightbox overlay
  return !!document.querySelector('[class*="backdrop-blur"]')
}

/**
 * Composable that registers global keyboard shortcuts:
 * - ← → to cycle between top-level nav pages (wrapping)
 * - ↑ ↓ to cycle art backgrounds on pages that have one
 *
 * Must be called once in a root-level component (App.vue).
 */
export function useKeyboardNav() {
  const route = useRoute()
  const router = useRouter()

  const currentLocale = computed(() => getLocaleFromPath(route.path))

  const navPaths = computed(() =>
    navSuffixes.map(s => `/${currentLocale.value}${s}`),
  )

  /**
   * Match the current route against nav paths.
   * Returns the index or -1 if not a top-level page.
   */
  function findNavIndex(): number {
    const path = route.path.replace(/\/$/, '') || '/'
    return navPaths.value.findIndex((p) => {
      const normalized = p.replace(/\/$/, '') || '/'
      return normalized === path
    })
  }

  // ← → Page navigation (cyclic, top-level only)
  onKeyStroke('ArrowRight', (e) => {
    if (isEditableTarget(e.target))
      return
    if (isImageLightboxOpen())
      return

    const idx = findNavIndex()
    if (idx === -1)
      return

    e.preventDefault()
    const navs = navPaths.value
    const next = (idx + 1) % navs.length
    router.push(navs[next])
  })

  onKeyStroke('ArrowLeft', (e) => {
    if (isEditableTarget(e.target))
      return
    if (isImageLightboxOpen())
      return

    const idx = findNavIndex()
    if (idx === -1)
      return

    e.preventDefault()
    const navs = navPaths.value
    const prev = (idx - 1 + navs.length) % navs.length
    router.push(navs[prev])
  })

  // ↑ ↓ Art background cycling (only on pages with art)
  onKeyStroke('ArrowDown', (e) => {
    if (isEditableTarget(e.target))
      return
    if (isImageLightboxOpen())
      return
    // Only cycle if an art component is currently rendered
    if (!document.querySelector('[data-art]'))
      return

    e.preventDefault()
    const current = artOverride.value || ''
    const idx = artStyles.indexOf(current as ArtStyle)
    const next = (idx + 1) % artStyles.length
    artOverride.value = artStyles[next]
  })

  onKeyStroke('ArrowUp', (e) => {
    if (isEditableTarget(e.target))
      return
    if (isImageLightboxOpen())
      return
    if (!document.querySelector('[data-art]'))
      return

    e.preventDefault()
    const current = artOverride.value || ''
    const idx = artStyles.indexOf(current as ArtStyle)
    const prev = (idx - 1 + artStyles.length) % artStyles.length
    artOverride.value = artStyles[prev]
  })

  // F5 — reset art override to the page's default (frontmatter value)
  onKeyStroke('F5', (e) => {
    if (!document.querySelector('[data-art]'))
      return
    e.preventDefault()
    artOverride.value = ''
  })
}

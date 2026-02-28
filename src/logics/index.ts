import dayjs from 'dayjs'
import { nextTick } from 'vue'

export const isDark = useDark()

export const onlyLanguage = useLocalStorage('antfu-only-language', false)

export const galleryView = useLocalStorage<'cover' | 'contain'>('antfu-gallery-view', 'cover')

export function toggleDark(event: MouseEvent) {
  // @ts-expect-error experimental API
  const isAppearanceTransition = document.startViewTransition
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!isAppearanceTransition) {
    isDark.value = !isDark.value
    return
  }

  const x = event.clientX
  const y = event.clientY
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  )
  const transition = document.startViewTransition(async () => {
    isDark.value = !isDark.value
    await nextTick()
  })
  transition.ready
    .then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ]
      document.documentElement.animate(
        {
          clipPath: isDark.value
            ? [...clipPath].reverse()
            : clipPath,
        },
        {
          duration: 400,
          easing: 'ease-out',
          fill: 'forwards',
          pseudoElement: isDark.value
            ? '::view-transition-old(root)'
            : '::view-transition-new(root)',
        },
      )
    })
}

export function formatDate(d: string | Date, onlyDate = true) {
  const date = dayjs(d)
  if (onlyDate || date.year() === dayjs().year())
    return date.format('MMM D')
  return date.format('MMM D, YYYY')
}

export function resolvePath(path: string, currentRoutePath: string) {
  if (path.startsWith('http') || path.startsWith('#') || path.startsWith('mailto'))
    return path

  const parts = currentRoutePath.split('/')
  const locale = ['en', 'ru', 'es'].includes(parts[1]) ? parts[1] : 'en'

  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  
  if (cleanPath.startsWith('en/') || cleanPath.startsWith('ru/') || cleanPath.startsWith('es/'))
    return `/${cleanPath}`

  return `/${locale}/${cleanPath}`
}
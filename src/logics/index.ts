import dayjs from 'dayjs'
import { nextTick } from 'vue'

export * from './post-visibility'

export const isDark = useDark()

export const onlyLanguage = useLocalStorage('teslak-only-language', false)

export const galleryView = useLocalStorage<'cover' | 'contain'>('teslak-gallery-view', 'cover')

export const isLightboxOpen = ref(false)

type DocumentWithOptionalViewTransition = Document & {
  startViewTransition?: Document['startViewTransition']
}

export function toggleDark(event: MouseEvent) {
  // lib.dom models this API as always present, but we still need a runtime guard.
  const startViewTransition = (document as DocumentWithOptionalViewTransition)
    .startViewTransition
    ?.bind(document)

  if (!startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    isDark.value = !isDark.value
    return
  }

  const x = event.clientX
  const y = event.clientY
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  )
  const transition = startViewTransition(async () => {
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

function parseDisplayDate(d: string | Date) {
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/)
    if (match)
      return dayjs(`${match[1]}-${match[2]}-${match[3]}`)
  }

  return dayjs(d)
}

function getDisplayDateFormat(locale: string, includeYear: boolean) {
  if (locale === 'en')
    return includeYear ? 'MMM D, YYYY' : 'MMM D'
  return includeYear ? 'D MMM YYYY' : 'D MMM'
}

export function formatDate(d: string | Date, onlyDate = true, locale = dayjs.locale()) {
  const date = parseDisplayDate(d).locale(locale)
  if (!date.isValid())
    return ''
  const now = dayjs()
  const includeYear = !onlyDate && date.year() !== now.year()
  const formatted = date.format(getDisplayDateFormat(locale, includeYear))
  return formatted.replace('.', '')
}

export function isRecentPost(date: string | Date, updated?: string | Date): boolean {
  const effectiveDate = updated ? dayjs(updated) : dayjs(date)
  const now = dayjs()
  // 1-day grace period: show 🌱 even if the date is slightly in the future
  // (handles timezone mismatches and minor scheduling errors)
  return now.diff(effectiveDate, 'day') < 15 && effectiveDate.isBefore(now.add(1, 'day'))
}

export function parseReadingMinutes(duration: unknown): number | undefined {
  if (typeof duration === 'number' && Number.isFinite(duration))
    return Math.max(1, Math.round(duration))

  if (typeof duration === 'string') {
    const match = duration.trim().match(/^(\d+)(?:\s*min)?$/i)
    if (match)
      return Math.max(1, Number.parseInt(match[1], 10))
  }

  return undefined
}

export function formatReadingDuration(duration: unknown, locale = 'en') {
  const minutes = parseReadingMinutes(duration)
  if (minutes == null)
    return undefined

  if (locale === 'ru')
    return `${minutes} мин`

  return `${minutes} min`
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

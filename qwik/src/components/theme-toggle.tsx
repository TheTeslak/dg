import { $, component$, useSignal, useVisibleTask$ } from '@qwik.dev/core'

const themeStorageKey = 'vueuse-color-scheme'

function resolveDarkMode(win: Window): boolean {
  const stored = win.localStorage.getItem(themeStorageKey)
  if (stored === 'dark')
    return true
  if (stored === 'light')
    return false
  return win.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyDarkMode(enabled: boolean): void {
  document.documentElement.classList.toggle('dark', enabled)
}

export const ThemeToggle = component$(() => {
  const isDark = useSignal(false)

  useVisibleTask$(({ cleanup }) => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => {
      const enabled = resolveDarkMode(window)
      isDark.value = enabled
      applyDarkMode(enabled)
    }

    sync()

    const handleChange = () => {
      if (!window.localStorage.getItem(themeStorageKey))
        sync()
    }

    media.addEventListener('change', handleChange)
    cleanup(() => media.removeEventListener('change', handleChange))
  }, { strategy: 'document-ready' })

  const toggleTheme$ = $(() => {
    const nextValue = !isDark.value
    isDark.value = nextValue
    window.localStorage.setItem(themeStorageKey, nextValue ? 'dark' : 'light')
    applyDarkMode(nextValue)
  })

  return (
    <button
      type="button"
      class="nav-item select-none op50 transition outline-none hover:op100"
      title="Toggle Color Scheme"
      aria-label="Toggle Color Scheme"
      onClick$={toggleTheme$}
    >
      <span class={isDark.value ? 'i-ri-moon-line' : 'i-ri-sun-line'} />
    </button>
  )
})

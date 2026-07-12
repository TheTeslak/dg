import type { SupportedLocale } from '../locales/config.ts'
import { LOCALE_COOKIE_NAME } from '../locales/config.ts'
import { resolveLocalePreference } from '../locales/negotiation'

const COOKIE_RE = new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE_NAME}=([^;]*)`)
const MAX_AGE = 365 * 24 * 60 * 60 // 1 year
const LEGACY_STORAGE_KEY = 'site-locale-pref'

export function getLocaleCookie(): SupportedLocale | undefined {
  if (typeof document === 'undefined')
    return undefined
  const match = document.cookie.match(COOKIE_RE)
  return resolveLocalePreference(match?.[1])
}

export function setLocaleCookie(locale: SupportedLocale) {
  if (typeof document === 'undefined')
    return

  // The preference must reach Netlify Edge; localStorage cannot affect the initial request.
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`
}

export function migrateLegacyLocalePreference() {
  if (typeof window === 'undefined')
    return

  try {
    const legacyLocale = resolveLocalePreference(window.localStorage.getItem(LEGACY_STORAGE_KEY))
    if (!getLocaleCookie() && legacyLocale)
      setLocaleCookie(legacyLocale)

    // Migration is one-way so cookie and localStorage cannot become competing preferences.
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  }
  catch {
    // Storage can be unavailable in privacy modes; locale selection must remain usable.
  }
}

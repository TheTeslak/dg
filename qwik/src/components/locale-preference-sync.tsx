import type { SupportedLocale } from '../lib/locales'
import { component$, useVisibleTask$ } from '@qwik.dev/core'
import { syncLocalePreference } from '../lib/locales'

interface LocalePreferenceSyncProps {
  locale: SupportedLocale
}

export const LocalePreferenceSync = component$<LocalePreferenceSyncProps>(
  ({ locale }) => {
    useVisibleTask$(({ track }) => {
      track(() => locale)
      syncLocalePreference(locale)
    })

    return null
  },
)

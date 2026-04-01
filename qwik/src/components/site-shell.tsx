import { component$, Slot } from '@qwik.dev/core'
import { Link, useLocation } from '@qwik.dev/router'
import {
  getLocaleFromPath,
  localeLabels,
  localeShortLabels,
  setPathLocale,
  supportedLocales,
} from '../lib/locales'
import { LocalePreferenceSync } from './locale-preference-sync'
import { Logo } from './logo'

export const SiteShell = component$(() => {
  const location = useLocation()
  const locale = getLocaleFromPath(location.url.pathname)
  const feedHref = locale && locale !== 'en' ? `/feed-${locale}.xml` : '/feed.xml'

  return (
    <div class="qwik-shell bg-base color-base">
      {locale ? <LocalePreferenceSync locale={locale} /> : null}

      <header class="sticky top-0 z-50 border-b border-base bg-[color:var(--c-bg)]/90 backdrop-blur">
        <div class="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-5 py-4">
          <Link
            href={locale ? `/${locale}` : '/'}
            class="flex items-center gap-3 no-underline color-base"
            aria-label="Anthony Fu home"
          >
            <Logo />
            <span class="font-condensed text-xl tracking-wide">Anthony Fu</span>
          </Link>

          <nav
            aria-label="Primary"
            class="ml-auto flex flex-wrap items-center gap-3 text-sm"
          >
            {locale
              ? (
                  <>
                    <Link href={`/${locale}/notes`} class="op70 hover:op100 no-underline">
                      Notes
                    </Link>
                    <Link href={`/${locale}/projects`} class="op70 hover:op100 no-underline">
                      Projects
                    </Link>
                    <Link href={`/${locale}/photos`} class="op70 hover:op100 no-underline">
                      Photos
                    </Link>
                  </>
                )
              : null}

            <div class="mx-1 h-4 w-px bg-black/10 dark:bg-white/10" />

            <a
              href="https://t.me/"
              target="_blank"
              rel="noopener noreferrer"
              class="op70 hover:op100 no-underline"
            >
              Telegram
            </a>
            <a
              href={feedHref}
              target="_blank"
              rel="noopener noreferrer"
              class="op70 hover:op100 no-underline"
            >
              RSS
            </a>

            <div class="mx-1 h-4 w-px bg-black/10 dark:bg-white/10" />

            {supportedLocales.map(item => (
              <Link
                key={item}
                href={setPathLocale(
                  location.url.pathname,
                  item,
                  location.url.search,
                  location.url.hash,
                )}
                class={[
                  'rounded-full px-2 py-1 no-underline transition-opacity',
                  locale === item
                    ? 'op100 bg-black/6 dark:bg-white/8'
                    : 'op60 hover:op100',
                ]}
                aria-label={`Switch language to ${localeLabels[item]}`}
              >
                {localeShortLabels[item]}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main class="px-5 py-10">
        <Slot />
      </main>
    </div>
  )
})

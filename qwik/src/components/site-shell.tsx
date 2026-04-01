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
import { SiteFooter } from './site-footer'
import { ThemeToggle } from './theme-toggle'

const navCopy = {
  en: {
    notes: 'Notes',
    projects: 'Projects',
    photos: 'Photos',
  },
  ru: {
    notes: 'Заметки',
    projects: 'Проекты',
    photos: 'Фото',
  },
  es: {
    notes: 'Notas',
    projects: 'Proyectos',
    photos: 'Fotos',
  },
} as const

export const SiteShell = component$(() => {
  const location = useLocation()
  const locale = getLocaleFromPath(location.url.pathname)
  const feedHref = locale && locale !== 'en' ? `/feed-${locale}.xml` : '/feed.xml'
  const labels = locale ? navCopy[locale] : null
  const homeHref = locale ? `/${locale}` : '/'

  return (
    <div class="qwik-shell bg-base color-base">
      {locale ? <LocalePreferenceSync locale={locale} /> : null}

      <header class="header z-40">
        <Link
          href={homeHref}
          class="logo-link w-12 h-12 absolute lg:fixed m-5 select-none outline-none color-base"
          aria-label="Anthony Fu home"
        >
          <Logo />
        </Link>

        <nav class="nav">
          <div class="spacer" />
          <div class="right print:op0">
            {locale && labels
              ? (
                  <>
                    <Link href={`/${locale}/notes`} title={labels.notes}>
                      <span class="lt-md:hidden">{labels.notes}</span>
                      <div class="i-ri-article-line md:hidden" />
                    </Link>
                    <Link href={`/${locale}/projects`} title={labels.projects}>
                      <span class="lt-md:hidden">{labels.projects}</span>
                      <div class="i-ri-lightbulb-line md:hidden" />
                    </Link>
                    <Link
                      href={`/${locale}/photos`}
                      title={labels.photos}
                      class="lt-md:hidden"
                    >
                      {labels.photos}
                    </Link>
                  </>
                )
              : null}

            <a href="https://t.me/" target="_blank" rel="noopener noreferrer" title="Telegram" class="lt-md:hidden">
              <div class="i-ri-telegram-2-line scale-110" />
            </a>
            <a href={feedHref} target="_blank" rel="noopener noreferrer" title="RSS" class="lt-md:hidden">
              <div class="i-ri-rss-line" />
            </a>

            <ThemeToggle />

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
                  'nav-item select-none uppercase text-xs tracking-[0.2em] outline-none transition',
                  locale === item ? 'op100' : 'op50 hover:op100',
                ]}
                aria-label={`Switch language to ${localeLabels[item]}`}
                title={localeLabels[item]}
              >
                {localeShortLabels[item]}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main class="px-7 py-10 of-x-hidden">
        <Slot />
        <SiteFooter />
      </main>
    </div>
  )
})

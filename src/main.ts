import type { SupportedLocale } from './locales/config'
import { FluentBundle, FluentResource } from '@fluent/bundle'
import dayjs from 'dayjs'
import LocalizedFormat from 'dayjs/plugin/localizedFormat.js'
import { createFluentVue } from 'fluent-vue'
import NProgress from 'nprogress'
import { createPinia } from 'pinia'
import { ViteSSG } from 'vite-ssg'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'
import { getDateLocale, getLanguageTag, getMessageFallbackOrder, supportedLocales } from './locales/config'
import { getLocaleFromPath } from './logics/i18n-path'
import { migrateLegacyLocalePreference } from './logics/locale-cookie'
import 'dayjs/locale/ru'
import 'dayjs/locale/es'
import 'dayjs/locale/pt-br'
import 'dayjs/locale/de'
import 'dayjs/locale/fr'
import '@unocss/reset/tailwind.css'
import './styles/main.css'

import './styles/prose.css'
import './styles/markdown.css'
import 'uno.css'

const localeResources = import.meta.glob('./locales/*.ftl', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const localesMap = Object.fromEntries(
  supportedLocales.map((locale) => {
    const resources = localeResources[`./locales/${locale}.ftl`]
    if (!resources)
      throw new Error(`Missing Fluent resources for locale "${locale}".`)
    return [locale, resources]
  }),
) as Record<SupportedLocale, string>

export const createApp = ViteSSG(
  App,
  {
    routes,
    scrollBehavior(to, from, savedPosition) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const html = document.querySelector('html')
          if (html) {
            if (savedPosition?.top || to.hash)
              html.classList.add('no-sliding')
            else
              html.classList.remove('no-sliding')
          }
          if (savedPosition)
            resolve(savedPosition)
          else if (to.hash)
            resolve({ el: to.hash, behavior: 'smooth' })
          else
            resolve({ top: 0 })
        }, 50)
      })
    },
  },
  ({ router, app, isClient, routePath }) => {
    dayjs.extend(LocalizedFormat)

    app.use(createPinia())

    if (isClient)
      migrateLegacyLocalePreference()

    const bundles: FluentBundle[] = Object.entries(localesMap).map(([locale, resources]) => {
      const bundle = new FluentBundle(locale)
      bundle.addResource(new FluentResource(resources))
      return bundle
    })

    const fluent = createFluentVue({
      bundles,
    })

    function applyRouteLocale(path: string) {
      const targetLocale = getLocaleFromPath(path)

      dayjs.locale(getDateLocale(targetLocale))

      const currentBundles = [...fluent.bundles] as FluentBundle[]
      const bundlesByLocale = new Map(currentBundles.map(bundle => [bundle.locales[0], bundle]))
      // Fluent fallback is intentionally independent from article fallback policy.
      fluent.bundles = getMessageFallbackOrder(targetLocale)
        .map(locale => bundlesByLocale.get(locale))
        .filter((bundle): bundle is FluentBundle => !!bundle)

      return targetLocale
    }

    applyRouteLocale(routePath || (typeof window !== 'undefined' ? window.location.pathname : '/'))

    app.use(fluent)

    if (isClient) {
      router.beforeEach((to, from, next) => {
        const targetLocale = applyRouteLocale(to.path)

        // The route locale remains the document language for accessibility on fallback pages.
        document.querySelector('html')?.setAttribute('lang', getLanguageTag(targetLocale))

        NProgress.start()
        next()
      })

      router.afterEach(() => {
        NProgress.done()
      })
    }
  },
)

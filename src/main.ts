import { FluentBundle, FluentResource } from '@fluent/bundle'
import dayjs from 'dayjs'
import LocalizedFormat from 'dayjs/plugin/localizedFormat.js'
import FloatingVue from 'floating-vue'
import { createFluentVue } from 'fluent-vue'
import NProgress from 'nprogress'
import { createPinia } from 'pinia'
import { ViteSSG } from 'vite-ssg'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'
import enResources from './locales/en.ftl?raw'
import esResources from './locales/es.ftl?raw'
import ruResources from './locales/ru.ftl?raw'
import 'dayjs/locale/ru'
import 'dayjs/locale/es'
import '@unocss/reset/tailwind.css'
import 'floating-vue/dist/style.css'
import './styles/main.css'

import './styles/prose.css'
import './styles/markdown.css'
import 'uno.css'

const localesMap = {
  en: enResources,
  ru: ruResources,
  es: esResources,
}

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
  ({ router, app, isClient }) => {
    dayjs.extend(LocalizedFormat)

    app.use(FloatingVue)
    app.use(createPinia())

    const bundles: FluentBundle[] = Object.entries(localesMap).map(([locale, resources]) => {
      const bundle = new FluentBundle(locale)
      bundle.addResource(new FluentResource(resources))
      return bundle
    })

    const fluent = createFluentVue({
      bundles,
    })

    app.use(fluent)

    if (isClient) {
      router.beforeEach((to, from, next) => {
        const path = to.path
        const pathParts = path.split('/')
        const pathLocale = pathParts.length > 1 ? pathParts[1] : 'en'
        const targetLocale = ['en', 'ru', 'es'].includes(pathLocale) ? pathLocale : 'en'

        dayjs.locale(targetLocale)

        const currentBundles = [...fluent.bundles] as FluentBundle[]
        const currentPrimary = currentBundles.find(b => b.locales[0] === targetLocale)

        if (currentPrimary && currentBundles[0].locales[0] !== targetLocale) {
          fluent.bundles = [
            currentPrimary,
            ...currentBundles.filter(b => b.locales[0] !== targetLocale),
          ]
        }

        // Always sync <html lang> with the current route locale (WCAG 3.1.1)
        document.querySelector('html')?.setAttribute('lang', targetLocale)

        NProgress.start()
        next()
      })

      router.afterEach(() => {
        NProgress.done()
      })
    }
  },
)

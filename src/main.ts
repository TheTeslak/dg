import dayjs from 'dayjs'
import LocalizedFormat from 'dayjs/plugin/localizedFormat.js'
import 'dayjs/locale/ru'
import 'dayjs/locale/es'
import FloatingVue from 'floating-vue'
import NProgress from 'nprogress'
import { createPinia } from 'pinia'
import { ViteSSG } from 'vite-ssg'
import { setupRouterScroller } from 'vue-router-better-scroller'
import { routes } from 'vue-router/auto-routes'
import { FluentBundle, FluentResource } from '@fluent/bundle'
import { createFluentVue } from 'fluent-vue'
import App from './App.vue'
import '@unocss/reset/tailwind.css'
import 'floating-vue/dist/style.css'
import 'markdown-it-github-alerts/styles/github-colors-light.css'
import 'markdown-it-github-alerts/styles/github-colors-dark-class.css'
import 'markdown-it-github-alerts/styles/github-base.css'
import '@shikijs/twoslash/style-rich.css'
import 'shiki-magic-move/style.css'
import './styles/main.css'
import './styles/prose.css'
import './styles/markdown.css'
import 'uno.css'

import enResources from './locales/en.ftl?raw'
import ruResources from './locales/ru.ftl?raw'
import esResources from './locales/es.ftl?raw'

const localesMap = {
  en: enResources,
  ru: ruResources,
  es: esResources,
}

export const createApp = ViteSSG(
  App,
  {
    routes,
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
      const html = document.querySelector('html')!
      setupRouterScroller(router, {
        selectors: {
          html(ctx) {
            if (ctx.savedPosition?.top || import.meta.hot)
              html.classList.add('no-sliding')
            else
              html.classList.remove('no-sliding')
            return true
          },
        },
        behavior: 'auto',
      })

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
             ...currentBundles.filter(b => b.locales[0] !== targetLocale)
           ]
           
           document.querySelector('html')?.setAttribute('lang', targetLocale)
        }
        
        NProgress.start()
        next()
      })
      
      router.afterEach(() => {
        NProgress.done()
      })
    }
  },
)
import { component$ } from '@qwik.dev/core'
import {
  DocumentHeadTags,
  RouterOutlet,
  useLocation,
  useQwikRouter,
} from '@qwik.dev/router'
import { getCanonicalUrl } from '../../src/logics/site'
import './global.css'
import 'uno.css'

export default component$(() => {
  useQwikRouter()
  const location = useLocation()

  return (
    <>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script
          dangerouslySetInnerHTML={`(() => {
            try {
              const key = 'vueuse-color-scheme';
              const stored = window.localStorage.getItem(key);
              const dark = stored === 'dark'
                || (stored !== 'light'
                  && window.matchMedia('(prefers-color-scheme: dark)').matches);
              document.documentElement.classList.toggle('dark', dark);
            }
            catch {}
          })();`}
        />
        <DocumentHeadTags />
        <link rel="canonical" href={getCanonicalUrl(location.url.pathname)} />
      </head>
      <body>
        <RouterOutlet />
      </body>
    </>
  )
})

import type { DocumentHead } from '@qwik.dev/router'
import { component$, useVisibleTask$ } from '@qwik.dev/core'
import { Link, routeLoader$, useLocation, useNavigate } from '@qwik.dev/router'
import {
  getPreferredLocaleFromWindow,
  localeLabels,
  setPathLocale,
} from '../lib/locales'

export const useHomeOverview = routeLoader$(async () => {
  const { getHomeOverview } = await import('../lib/content.server')
  return getHomeOverview()
})

export default component$(() => {
  const overview = useHomeOverview().value
  const location = useLocation()
  const navigate = useNavigate()

  useVisibleTask$(async () => {
    const locale = getPreferredLocaleFromWindow(window)
    await navigate(
      setPathLocale(
        location.url.pathname,
        locale,
        location.url.search,
        location.url.hash,
      ),
      { replaceState: true },
    )
  })

  return (
    <section class="mx-auto flex max-w-5xl flex-col gap-8">
      <div class="prose max-w-none">
        <h1>Anthony Fu</h1>
        <p>
          Redirecting to the best matching locale. If JavaScript is disabled,
          pick a locale below.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        {overview.map(item => (
          <Link
            key={item.locale}
            href={`/${item.locale}`}
            class="rounded-2xl border border-base p-5 no-underline transition-colors hover:bg-black/2 dark:hover:bg-white/4"
          >
            <div class="text-xs uppercase tracking-[0.2em] op60">{item.locale}</div>
            <div class="mt-2 text-2xl font-condensed color-base">
              {localeLabels[item.locale]}
            </div>
            <div class="mt-4 flex gap-6 text-sm op70">
              <span>
                {item.notes}
                {' '}
                notes
              </span>
              <span>
                {item.articles}
                {' '}
                articles
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
})

export const head: DocumentHead = {
  title: 'Anthony Fu',
  meta: [
    {
      name: 'description',
      content: 'Anthony Fu portfolio and notes.',
    },
  ],
}

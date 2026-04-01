import type { DocumentHead } from '@qwik.dev/router'
import { component$ } from '@qwik.dev/core'
import { routeLoader$ } from '@qwik.dev/router'
import {
  stripSiteSuffix,
} from '../../lib/content-shared'
import { isSupportedLocale } from '../../lib/locales'

export const usePage = routeLoader$(async ({ params }) => {
  if (!isSupportedLocale(params.lang))
    return null

  const { getPage } = await import('../../lib/content.server')
  return getPage(params.lang, params.page)
})

export default component$(() => {
  const page = usePage().value

  if (!page) {
    return (
      <section class="prose mx-auto max-w-3xl">
        <h1>Page not found</h1>
        <p>This page has not been migrated yet or is outside the current Qwik scope.</p>
      </section>
    )
  }

  const title = page.display || stripSiteSuffix(page.title)
  const wrapperClass = page.className || 'prose mx-auto max-w-3xl'

  return (
    <article class={wrapperClass}>
      <header class="mb-10">
        <h1>{title}</h1>
        {page.subtitle
          ? (
              <p class="text-lg op70">{page.subtitle}</p>
            )
          : null}
      </header>

      <div dangerouslySetInnerHTML={page.html} />
    </article>
  )
})

export const head: DocumentHead = ({ resolveValue }) => {
  const page = resolveValue(usePage)

  if (!page) {
    return {
      title: 'Page not found',
    }
  }

  return {
    title: page.title,
    meta: page.description
      ? [
          {
            name: 'description',
            content: page.description,
          },
        ]
      : [],
  }
}

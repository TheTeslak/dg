import type { DocumentHead } from '@qwik.dev/router'
import type { SupportedLocale } from '../../lib/locales'
import { component$ } from '@qwik.dev/core'
import { Link, routeLoader$ } from '@qwik.dev/router'
import { PostList } from '../../components/post-list'
import {
  isSupportedLocale,
  localeLabels,

} from '../../lib/locales'

export const useLocaleOverview = routeLoader$(async ({ params }) => {
  if (!isSupportedLocale(params.lang)) {
    return null
  }

  const { getLocaleOverview } = await import('../../lib/content.server')
  return getLocaleOverview(params.lang)
})

export default component$(() => {
  const overview = useLocaleOverview().value

  if (!overview) {
    return (
      <section class="prose mx-auto max-w-3xl">
        <h1>Locale not found</h1>
        <p>Use one of the supported locales: en, ru, es.</p>
      </section>
    )
  }

  const locale = overview.locale

  return (
    <section class="mx-auto flex max-w-5xl flex-col gap-10">
      <div class="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div class="prose max-w-none">
          <div class="text-xs uppercase tracking-[0.2em] op60">
            {localeLabels[locale]}
          </div>
          <h1>Anthony Fu</h1>
          <p>
            First Qwik rewrite slice for the
            {' '}
            <strong>{locale}</strong>
            {' '}
            locale.
            Notes and article indexes are now loaded directly from the existing
            markdown content under
            {' '}
            <code>
              pages/
              {locale}
              /articles
            </code>
            .
          </p>
          <p class="flex flex-wrap gap-4">
            <Link
              href={`/${locale}/notes`}
              class="rounded-full border border-base px-4 py-2 no-underline transition-colors hover:bg-black/4 dark:hover:bg-white/6"
            >
              Browse Notes
            </Link>
            <Link
              href={`/${locale}/articles`}
              class="rounded-full border border-base px-4 py-2 no-underline transition-colors hover:bg-black/4 dark:hover:bg-white/6"
            >
              Browse Articles
            </Link>
          </p>
        </div>

        <div class="rounded-2xl border border-base p-6">
          <div class="text-sm uppercase tracking-[0.2em] op60">Content</div>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div class="text-3xl font-condensed">{overview.notes}</div>
              <div class="text-sm op70">Visible notes</div>
            </div>
            <div>
              <div class="text-3xl font-condensed">{overview.articles}</div>
              <div class="text-sm op70">Visible articles</div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-8 lg:grid-cols-2">
        <section>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-2xl font-condensed">Latest Notes</h2>
            <Link href={`/${locale}/notes`} class="op60 hover:op100">
              View all
            </Link>
          </div>
          <PostList
            locale={locale}
            posts={overview.latestNotes}
            emptyMessage="No visible notes yet."
          />
        </section>

        <section>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-2xl font-condensed">Latest Articles</h2>
            <Link href={`/${locale}/articles`} class="op60 hover:op100">
              View all
            </Link>
          </div>
          <PostList
            locale={locale}
            posts={overview.latestArticles}
            emptyMessage="No visible articles yet."
          />
        </section>
      </div>
    </section>
  )
})

export const head: DocumentHead = ({ params }) => {
  const locale = isSupportedLocale(params.lang)
    ? (params.lang as SupportedLocale)
    : 'en'

  return {
    title: `Anthony Fu · ${localeLabels[locale]}`,
    meta: [
      {
        name: 'description',
        content: `Qwik rewrite overview for the ${localeLabels[locale]} locale.`,
      },
    ],
  }
}

import type { DocumentHead } from '@qwik.dev/router'
import { component$ } from '@qwik.dev/core'
import { routeLoader$ } from '@qwik.dev/router'
import { PostList } from '../../../components/post-list'
import { SectionTabs } from '../../../components/section-tabs'
import { isSupportedLocale } from '../../../lib/locales'

export const useNotes = routeLoader$(async ({ params }) => {
  if (!isSupportedLocale(params.lang)) {
    return null
  }

  const { listPosts } = await import('../../../lib/content.server')
  return {
    locale: params.lang,
    posts: await listPosts(params.lang, 'note'),
  }
})

export default component$(() => {
  const data = useNotes().value

  if (!data) {
    return (
      <section class="prose mx-auto max-w-3xl">
        <h1>Notes</h1>
        <p>Unsupported locale.</p>
      </section>
    )
  }

  return (
    <section class="mx-auto max-w-4xl">
      <SectionTabs locale={data.locale} current="notes" />
      <div class="prose mb-8 max-w-none">
        <h1>Notes</h1>
        <p>Short-form notes rendered from the existing markdown archive.</p>
      </div>
      <PostList
        locale={data.locale}
        posts={data.posts}
        emptyMessage="No visible notes in this locale."
      />
    </section>
  )
})

export const head: DocumentHead = {
  title: 'Notes',
  meta: [
    {
      name: 'description',
      content: 'Visible notes rendered by the Qwik rewrite.',
    },
  ],
}

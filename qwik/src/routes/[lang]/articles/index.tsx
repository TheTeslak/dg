import type { DocumentHead } from '@qwik.dev/router'
import { component$ } from '@qwik.dev/core'
import { routeLoader$ } from '@qwik.dev/router'
import { PostList } from '../../../components/post-list'
import { SectionTabs } from '../../../components/section-tabs'
import { isSupportedLocale } from '../../../lib/locales'

export const useArticles = routeLoader$(async ({ params }) => {
  if (!isSupportedLocale(params.lang)) {
    return null
  }

  const { listPosts } = await import('../../../lib/content.server')
  return {
    locale: params.lang,
    posts: await listPosts(params.lang, 'blog'),
  }
})

export default component$(() => {
  const data = useArticles().value

  if (!data) {
    return (
      <section class="prose mx-auto max-w-3xl">
        <h1>Articles</h1>
        <p>Unsupported locale.</p>
      </section>
    )
  }

  return (
    <section class="mx-auto max-w-4xl">
      <SectionTabs locale={data.locale} current="articles" />
      <div class="prose mb-8 max-w-none">
        <h1>Articles</h1>
        <p>Long-form writing rendered from the existing markdown archive.</p>
      </div>
      <PostList
        locale={data.locale}
        posts={data.posts}
        emptyMessage="No visible articles in this locale."
      />
    </section>
  )
})

export const head: DocumentHead = {
  title: 'Articles',
  meta: [
    {
      name: 'description',
      content: 'Visible articles rendered by the Qwik rewrite.',
    },
  ],
}

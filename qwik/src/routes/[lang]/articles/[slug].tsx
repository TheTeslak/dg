import type { DocumentHead } from '@qwik.dev/router'
import { component$ } from '@qwik.dev/core'
import { Link, routeLoader$ } from '@qwik.dev/router'
import { formatDate } from '../../../lib/content-shared'
import { isSupportedLocale } from '../../../lib/locales'

export const usePost = routeLoader$(async ({ params }) => {
  const { getPost } = await import('../../../lib/content.server')
  return getPost(params.lang, params.slug)
})

export default component$(() => {
  const post = usePost().value

  if (!post) {
    return (
      <section class="prose mx-auto max-w-3xl">
        <h1>Article not found</h1>
        <p>This article has not been migrated yet or does not exist in this locale.</p>
      </section>
    )
  }

  const locale = isSupportedLocale(post.locale) ? post.locale : 'en'
  const backHref = post.type?.split('+').includes('note')
    ? `/${locale}/notes`
    : `/${locale}/articles`

  return (
    <article class="prose m-auto max-w-3xl slide-enter-content">
      <p class="op60">
        <Link href={backHref}>Back</Link>
      </p>
      <h1>{post.title}</h1>
      <p class="op60">
        {formatDate(locale, post.date)}
        {post.duration ? ` · ${post.duration}` : ''}
      </p>
      <div dangerouslySetInnerHTML={post.html} />
    </article>
  )
})

export const head: DocumentHead = ({ resolveValue }) => {
  const post = resolveValue(usePost)

  if (!post) {
    return {
      title: 'Article not found',
    }
  }

  return {
    title: post.title,
    meta: post.description
      ? [
          {
            name: 'description',
            content: post.description,
          },
        ]
      : [],
  }
}

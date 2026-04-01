import type { DocumentHead } from '@qwik.dev/router'
import type { SupportedLocale } from '../../../lib/locales'
import { component$ } from '@qwik.dev/core'
import { routeLoader$ } from '@qwik.dev/router'
import { PostList } from '../../../components/post-list'
import { SectionTabs } from '../../../components/section-tabs'
import { isSupportedLocale } from '../../../lib/locales'

const copy: Record<SupportedLocale, { title: string, description: string, empty: string }> = {
  en: {
    title: 'Articles',
    description: 'Long-form writing rendered from the existing markdown archive.',
    empty: 'No visible articles in this locale.',
  },
  ru: {
    title: 'Статьи',
    description: 'Длинные тексты, отрендеренные из существующего markdown-архива.',
    empty: 'В этой локали нет видимых статей.',
  },
  es: {
    title: 'Artículos',
    description: 'Textos largos renderizados desde el archivo markdown existente.',
    empty: 'No hay artículos visibles en esta configuración regional.',
  },
}

export const useArticles = routeLoader$(async ({ params }) => {
  if (!isSupportedLocale(params.lang))
    return null

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

  const page = copy[data.locale]

  return (
    <section class="mx-auto max-w-4xl">
      <SectionTabs locale={data.locale} current="articles" />
      <div class="prose mb-8 max-w-none">
        <h1>{page.title}</h1>
        <p>{page.description}</p>
      </div>
      <PostList locale={data.locale} posts={data.posts} emptyMessage={page.empty} />
    </section>
  )
})

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useArticles)
  const locale = data?.locale && isSupportedLocale(data.locale)
    ? data.locale
    : 'en'
  const page = copy[locale]

  return {
    title: page.title,
    meta: [
      {
        name: 'description',
        content: page.description,
      },
    ],
  }
}

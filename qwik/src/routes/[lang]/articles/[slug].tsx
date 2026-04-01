import type { DocumentHead } from '@qwik.dev/router'
import type { SupportedLocale } from '../../../lib/locales'
import { component$ } from '@qwik.dev/core'
import { Link, routeLoader$ } from '@qwik.dev/router'
import { PostNavigation } from '../../../components/post-navigation'
import {
  formatDate,
  formatReadingDuration,
  isDraftPost,
  isRecentPost,
} from '../../../lib/content-shared'
import { isSupportedLocale } from '../../../lib/locales'

const copy: Record<
  SupportedLocale,
  {
    articleNotFound: string
    articleNotFoundBody: string
    backToAll: string
    updated: string
    at: string
    commentOn: string
    telegram: string
    mastodon: string
    referencedBy: string
  }
> = {
  en: {
    articleNotFound: 'Article not found',
    articleNotFoundBody: 'This article has not been migrated yet or does not exist in this locale.',
    backToAll: 'Back to all',
    updated: 'updated',
    at: 'at',
    commentOn: 'Comment on',
    telegram: 'Telegram',
    mastodon: 'Mastodon',
    referencedBy: 'Referenced by',
  },
  ru: {
    articleNotFound: 'Статья не найдена',
    articleNotFoundBody: 'Эта статья ещё не перенесена или отсутствует в этой локали.',
    backToAll: 'Ко всем записям',
    updated: 'обновлена',
    at: 'на',
    commentOn: 'Обсудить в',
    telegram: 'Телеграм',
    mastodon: 'Мастодон',
    referencedBy: 'Ссылаются',
  },
  es: {
    articleNotFound: 'Artículo no encontrado',
    articleNotFoundBody: 'Este artículo aún no se ha migrado o no existe en esta configuración regional.',
    backToAll: 'Volver a todo',
    updated: 'actualizado',
    at: 'en',
    commentOn: 'Comentar en',
    telegram: 'Telegram',
    mastodon: 'Mastodon',
    referencedBy: 'Referenciado por',
  },
}

export const usePostPage = routeLoader$(async ({ params }) => {
  const {
    getAdjacentPosts,
    getPost,
    getPostBacklinks,
    getReferencedBy,
  } = await import('../../../lib/content.server')

  const post = await getPost(params.lang, params.slug)
  if (!post || !isSupportedLocale(post.locale))
    return null

  const kind = post.type?.split('+').includes('note') ? 'note' : 'blog'
  const [backlinks, referencedBy, adjacent] = await Promise.all([
    getPostBacklinks(post.locale, post.backlink),
    getReferencedBy(post.locale, post.slug),
    getAdjacentPosts(post.locale, post.slug, kind),
  ])

  return {
    post,
    backlinks,
    referencedBy,
    adjacent,
  }
})

export default component$(() => {
  const page = usePostPage().value

  if (!page) {
    return (
      <section class="prose mx-auto max-w-3xl">
        <h1>{copy.en.articleNotFound}</h1>
        <p>{copy.en.articleNotFoundBody}</p>
      </section>
    )
  }

  const { adjacent, backlinks, post, referencedBy } = page
  const locale = post.locale
  const labels = copy[locale]
  const backHref = post.type?.split('+').includes('note')
    ? `/${locale}/notes`
    : `/${locale}/articles`
  const duration = formatReadingDuration(locale, post.duration)
  const headerClass = ['prose m-auto slide-enter-content', post.wrapperClass].filter(Boolean).join(' ')
  const contentClass = [post.tocAlwaysOn ? 'toc-always-on' : '', post.className].filter(Boolean).join(' ')

  return (
    <>
      <article class={headerClass} lang={post.lang}>
        {backlinks.length
          ? (
              <div class="mb-2 flex flex-wrap items-center gap-[0.15rem] gap-x-[0.6rem] slide-enter-50">
                {backlinks.map((backlink, index) => (
                  <div key={backlink.url} class="flex items-center gap-[0.35rem]">
                    {index > 0
                      ? <span class="mr-[0.25rem] text-[0.8rem] op30">·</span>
                      : null}
                    <Link href={backlink.url} class="inline-flex items-center gap-[0.35rem] text-base no-underline op40 hover:op75">
                      <span aria-hidden="true" class="i-ri-corner-left-up-line text-[0.85rem]" />
                      <span>{backlink.title}</span>
                    </Link>
                    {backlink.lang && backlink.lang !== locale
                      ? (
                          <span class="my-auto flex-none rounded bg-zinc:15 px-1 py-0.5 text-xs text-[#91919b]">
                            {backlink.lang.toUpperCase()}
                          </span>
                        )
                      : null}
                  </div>
                ))}
              </div>
            )
          : null}

        <h1 class="mb-0 slide-enter-50">
          {post.title}
        </h1>

        <p class="!-mt-8 slide-enter-50">
          <span class="op50">
            {isDraftPost(post.type, post.draft) ? '🚧 ' : ''}
            {isRecentPost(post.date, post.updated) && !isDraftPost(post.type, post.draft) ? '🌱 ' : ''}
            {formatDate(locale, post.date)}
            {post.updated ? ` · ${labels.updated} ${formatDate(locale, post.updated)}` : ''}
            {duration ? ` · ${duration}` : ''}
          </span>
        </p>

        {post.place
          ? (
              <p class="!mt-[-1rem]">
                <span class="op50">
                  {labels.at}
                  {' '}
                </span>
                {post.placeLink
                  ? (
                      <a href={post.placeLink} target="_blank" rel="noopener noreferrer">
                        {post.place}
                      </a>
                    )
                  : (
                      <span class="font-bold">{post.place}</span>
                    )}
              </p>
            )
          : null}

        {post.subtitle
          ? (
              <p class="!-mt-6 italic op50 slide-enter">
                {post.subtitle}
              </p>
            )
          : null}

        <div class={contentClass} dangerouslySetInnerHTML={post.html} />
      </article>

      <div class="prose m-auto mb-8 mt-8 slide-enter print:hidden">
        {post.telegram || post.mastodon
          ? (
              <p>
                <span class="font-mono op50">&gt; </span>
                <span class="op50">
                  {labels.commentOn}
                  {' '}
                </span>
                {post.telegram
                  ? (
                      <a href={post.telegram} target="_blank" rel="noopener noreferrer" class="op50">
                        {labels.telegram}
                      </a>
                    )
                  : null}
                {post.telegram && post.mastodon
                  ? <span class="op25"> / </span>
                  : null}
                {post.mastodon
                  ? (
                      <a href={post.mastodon} target="_blank" rel="noopener noreferrer" class="op50">
                        {labels.mastodon}
                      </a>
                    )
                  : null}
              </p>
            )
          : null}

        {referencedBy.length
          ? (
              <div class="mt-9 border-t border-[rgba(125,125,125,0.15)] pt-4">
                <div class="mb-2 flex items-center gap-[0.35rem] text-base op45">
                  <span aria-hidden="true" class="i-ri-links-line text-[0.9rem]" />
                  <span>{labels.referencedBy}</span>
                </div>
                {referencedBy.map(reference => (
                  <div key={reference.url} class="mb-[0.35rem] flex items-center gap-2">
                    <Link href={reference.url} class="inline-flex items-center gap-[0.3rem] text-base no-underline op60 hover:op100">
                      <span aria-hidden="true" class="i-ri-corner-left-up-line text-[0.85rem]" />
                      <span>{reference.title}</span>
                    </Link>
                    {reference.lang && reference.lang !== locale
                      ? (
                          <span class="my-auto flex-none rounded bg-zinc:15 px-1 py-0.5 text-xs text-[#91919b]">
                            {reference.lang.toUpperCase()}
                          </span>
                        )
                      : null}
                    <span class="whitespace-nowrap text-base op45">
                      {isDraftPost(reference.type) ? '🚧 ' : ''}
                      {isRecentPost(reference.date, reference.updated) && !isDraftPost(reference.type) ? '🌱 ' : ''}
                      {formatDate(locale, reference.date)}
                    </span>
                  </div>
                ))}
              </div>
            )
          : null}

        <PostNavigation locale={locale} newer={adjacent.newer} older={adjacent.older} />

        <p>
          <span class="font-mono op50">&gt; </span>
          <Link href={backHref} class="font-mono op50 hover:op75">
            {labels.backToAll}
          </Link>
        </p>
      </div>
    </>
  )
})

export const head: DocumentHead = ({ resolveValue }) => {
  const page = resolveValue(usePostPage)

  if (!page) {
    return {
      title: 'Article not found',
    }
  }

  return {
    title: page.post.title,
    meta: page.post.description
      ? [
          {
            name: 'description',
            content: page.post.description,
          },
        ]
      : [],
  }
}

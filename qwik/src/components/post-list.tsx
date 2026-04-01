import type { PostSummary } from '../lib/content-shared'
import type { SupportedLocale } from '../lib/locales'
import { component$ } from '@qwik.dev/core'
import { Link } from '@qwik.dev/router'
import {
  formatDate,
  formatReadingDuration,
  isDraftPost,
  isRecentPost,
} from '../lib/content-shared'

interface PostListProps {
  locale: SupportedLocale
  posts: PostSummary[]
  emptyMessage: string
}

function getGroupLabel(locale: SupportedLocale, post: PostSummary): string {
  const date = new Date(post.date)
  if (Number.isNaN(date.getTime()))
    return ''

  if (date.getTime() > Date.now()) {
    return locale === 'ru'
      ? 'Скоро'
      : locale === 'es'
        ? 'Próximamente'
        : 'Upcoming'
  }

  return `${date.getFullYear()}`
}

function isSameGroup(a: PostSummary, b?: PostSummary): boolean {
  if (!b)
    return false

  const aDate = new Date(a.date)
  const bDate = new Date(b.date)
  if (Number.isNaN(aDate.getTime()) || Number.isNaN(bDate.getTime()))
    return false

  const aFuture = aDate.getTime() > Date.now()
  const bFuture = bDate.getTime() > Date.now()
  return aFuture === bFuture && aDate.getFullYear() === bDate.getFullYear()
}

function getLangTag(locale: SupportedLocale, post: PostSummary): string | null {
  return post.lang && post.lang !== locale
    ? post.lang.toUpperCase()
    : null
}

export const PostList = component$<PostListProps>(
  ({ locale, posts, emptyMessage }) => {
    if (!posts.length)
      return <p class="op50">{emptyMessage}</p>

    return (
      <ul class="list-none p-0">
        {posts.map((post, index) => {
          const langTag = getLangTag(locale, post)
          const duration = formatReadingDuration(locale, post.duration)
          const showGroup = !isSameGroup(post, posts[index - 1])
          const content = (
            <div class="no-underline">
              <li class="flex flex-col gap-2 md:flex-row md:items-center">
                <div class="flex flex-wrap items-center gap-2 text-xl leading-[1.2em]">
                  {langTag
                    ? (
                        <span class="my-auto hidden flex-none rounded bg-zinc:15 px-1 py-0.5 text-xs text-[#91919b] md:block">
                          {langTag}
                        </span>
                      )
                    : null}
                  <span>{post.title}</span>
                  {post.redirect
                    ? (
                        <span
                          aria-hidden="true"
                          class="i-carbon-arrow-up-right ml-[-0.35rem] text-xs op50"
                          title="External"
                        />
                      )
                    : null}
                </div>

                <div class="flex flex-wrap items-center gap-2 text-xl op60">
                  <span class="whitespace-nowrap">
                    {isDraftPost(post.type, post.draft) ? '🚧 ' : ''}
                    {isRecentPost(post.date, post.updated) && !isDraftPost(post.type, post.draft) ? '🌱 ' : ''}
                    {formatDate(locale, post.date)}
                  </span>
                  {duration
                    ? (
                        <span class="whitespace-nowrap">
                          ·
                          {' '}
                          {duration}
                        </span>
                      )
                    : null}
                  {post.place
                    ? (
                        <span class="whitespace-nowrap md:hidden">
                          ·
                          {' '}
                          {post.place}
                        </span>
                      )
                    : null}
                  {langTag
                    ? (
                        <span class="my-auto flex-none rounded bg-zinc:15 px-1 py-0.5 text-xs text-[#91919b] md:hidden">
                          {langTag}
                        </span>
                      )
                    : null}
                </div>
              </li>

              {post.place
                ? (
                    <div class="mt-[-0.4rem] hidden text-xl op45 md:block">
                      {post.placeLink
                        ? (
                            <a href={post.placeLink} target="_blank" rel="noopener noreferrer">
                              {post.place}
                            </a>
                          )
                        : post.place}
                    </div>
                  )
                : null}
            </div>
          )

          return (
            <div key={`${post.locale}-${post.slug}`}>
              {showGroup
                ? (
                    <div
                      class="pointer-events-none relative h-20 select-none slide-enter"
                      style={{ '--enter-stage': `${index - 2}`, '--enter-step': '60ms' }}
                    >
                      <span class="absolute left-[-3rem] top-[-2rem] text-[8rem] font-bold color-transparent op10 text-stroke-2 text-stroke-hex-aaa">
                        {getGroupLabel(locale, post)}
                      </span>
                    </div>
                  )
                : null}

              <div
                class="slide-enter mb-6 mt-2"
                style={{ '--enter-stage': `${index}`, '--enter-step': '60ms' }}
              >
                {post.url.includes('://')
                  ? (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="block font-normal no-underline"
                      >
                        {content}
                      </a>
                    )
                  : (
                      <Link href={post.url} class="block font-normal no-underline">
                        {content}
                      </Link>
                    )}
              </div>
            </div>
          )
        })}
      </ul>
    )
  },
)

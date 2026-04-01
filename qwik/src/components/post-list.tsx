import type { PostSummary } from '../lib/content-shared'
import type { SupportedLocale } from '../lib/locales'
import { component$ } from '@qwik.dev/core'
import { Link } from '@qwik.dev/router'
import { formatDate } from '../lib/content-shared'

interface PostListProps {
  locale: SupportedLocale
  posts: PostSummary[]
  emptyMessage: string
}

export const PostList = component$<PostListProps>(
  ({ locale, posts, emptyMessage }) => {
    if (!posts.length) {
      return <p class="op60">{emptyMessage}</p>
    }

    return (
      <ul class="flex flex-col gap-4">
        {posts.map((post) => {
          const content = (
            <>
              <div class="text-lg leading-tight color-base">{post.title}</div>
              <div class="flex flex-wrap gap-2 text-sm op60">
                <span>{formatDate(locale, post.date)}</span>
                {post.duration
                  ? (
                      <span>
                        ·
                        {post.duration}
                      </span>
                    )
                  : null}
                {post.lang && post.lang !== locale
                  ? (
                      <span class="rounded bg-zinc:15 px-1.5 py-0.5 text-xs uppercase">
                        {post.lang}
                      </span>
                    )
                  : null}
              </div>
            </>
          )

          return (
            <li
              key={`${post.locale}-${post.slug}`}
              class="rounded-xl border border-base p-4 transition-colors hover:bg-black/2 dark:hover:bg-white/4"
            >
              {post.url.includes('://')
                ? (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="block no-underline"
                    >
                      {content}
                    </a>
                  )
                : (
                    <Link href={post.url} class="block no-underline">
                      {content}
                    </Link>
                  )}
            </li>
          )
        })}
      </ul>
    )
  },
)

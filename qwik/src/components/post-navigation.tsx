import type { JSXOutput } from '@qwik.dev/core'
import type { PostReference } from '../lib/content-shared'
import type { SupportedLocale } from '../lib/locales'
import { component$ } from '@qwik.dev/core'
import { Link } from '@qwik.dev/router'
import { formatDate, isDraftPost, isRecentPost } from '../lib/content-shared'

interface PostNavigationProps {
  locale: SupportedLocale
  newer: PostReference | null
  older: PostReference | null
}

function PostNavLink(props: {
  locale: SupportedLocale
  post: PostReference
  direction: 'newer' | 'older'
}): JSXOutput {
  const isExternal = props.post.url.includes('://')
  const arrowClass = props.direction === 'newer'
    ? 'i-ri-arrow-left-s-line'
    : 'i-ri-arrow-right-s-line'
  const content = (
    <>
      {props.direction === 'newer'
        ? <div aria-hidden="true" class={`${arrowClass} flex-none text-lg op40`} />
        : null}
      <div class={props.direction === 'older' ? 'min-w-0 flex flex-col items-end' : 'min-w-0 flex flex-col'}>
        <span class={props.direction === 'older' ? 'truncate text-right text-base leading-snug' : 'truncate text-base leading-snug'}>
          {props.post.title}
        </span>
        <span class="mt-0.5 text-base op45">
          {isDraftPost(props.post.type) ? '🚧 ' : ''}
          {isRecentPost(props.post.date, props.post.updated) && !isDraftPost(props.post.type) ? '🌱 ' : ''}
          {formatDate(props.locale, props.post.date)}
        </span>
      </div>
      {props.direction === 'older'
        ? <div aria-hidden="true" class={`${arrowClass} flex-none text-lg op40`} />
        : null}
    </>
  )

  const classes = [
    'flex-1 rounded-lg border border-base px-4 py-3 no-underline op65 transition-all hover:bg-black/4 hover:op100 dark:hover:bg-white/8',
    props.direction === 'older' ? 'flex items-center justify-end gap-3' : 'flex items-center gap-3',
  ].join(' ')

  return isExternal
    ? (
        <a href={props.post.url} target="_blank" rel="noopener noreferrer" class={classes}>
          {content}
        </a>
      )
    : (
        <Link href={props.post.url} class={classes}>
          {content}
        </Link>
      )
}

export const PostNavigation = component$<PostNavigationProps>(
  ({ locale, newer, older }) => {
    if (!newer && !older)
      return null

    return (
      <nav class="mb-6 mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:gap-4">
        {newer
          ? <PostNavLink locale={locale} post={newer} direction="newer" />
          : <div class="flex-1" />}
        {older
          ? <PostNavLink locale={locale} post={older} direction="older" />
          : <div class="flex-1" />}
      </nav>
    )
  },
)

import type { DocumentHead } from '@qwik.dev/router'
import type { SupportedLocale } from '../../../lib/locales'
import { component$, useSignal } from '@qwik.dev/core'
import { routeLoader$ } from '@qwik.dev/router'
import { PhotoGrid } from '../../../components/photo-grid'
import { isSupportedLocale } from '../../../lib/locales'
import { photos } from '../../../lib/photos'

const copy: Record<
  SupportedLocale,
  {
    title: string
    description: string
    note: string
  }
> = {
  en: {
    title: 'Photos',
    description: 'Photos by Anthony Fu.',
    note: 'Thanks for being interested in these photos.',
  },
  ru: {
    title: 'Фото',
    description: 'Фотографии Anthony Fu.',
    note: 'Спасибо за интерес к этим фотографиям.',
  },
  es: {
    title: 'Fotos',
    description: 'Fotos de Anthony Fu.',
    note: 'Gracias por interesarte por estas fotos.',
  },
}

export const usePhotosPage = routeLoader$(({ params }) => {
  if (!isSupportedLocale(params.lang))
    return null

  return {
    locale: params.lang,
    photos,
  }
})

export default component$(() => {
  const data = usePhotosPage().value
  const view = useSignal<'cover' | 'contain'>('cover')

  if (!data) {
    return (
      <section class="prose mx-auto max-w-3xl">
        <h1>Photos</h1>
        <p>Unsupported locale.</p>
      </section>
    )
  }

  const page = copy[data.locale]

  return (
    <section class="mx-auto max-w-6xl">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div class="prose max-w-none">
          <h1>{page.title}</h1>
          <p>{page.description}</p>
        </div>

        <button
          type="button"
          class="rounded-full border border-base px-4 py-2 transition-colors hover:bg-black/3 dark:hover:bg-white/6"
          aria-label="Toggle photo layout"
          onClick$={() => {
            view.value = view.value === 'cover' ? 'contain' : 'cover'
          }}
        >
          {view.value === 'cover' ? 'Contain' : 'Cover'}
        </button>
      </div>

      <PhotoGrid photos={data.photos} view={view.value} />

      <div class="prose mx-auto mt-10 max-w-3xl">
        <p>
          <em>{page.note}</em>
        </p>
      </div>
    </section>
  )
})

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePhotosPage)
  const locale = data?.locale || 'en'
  const page = copy[locale]

  return {
    title: `${page.title} - Anthony Fu`,
    meta: [
      {
        name: 'description',
        content: page.description,
      },
    ],
  }
}

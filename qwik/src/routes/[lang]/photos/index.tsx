import type { DocumentHead } from '@qwik.dev/router'
import type { SupportedLocale } from '../../../lib/locales'
import { component$, useSignal, useVisibleTask$ } from '@qwik.dev/core'
import { Link, routeLoader$ } from '@qwik.dev/router'
import { PhotoGrid } from '../../../components/photo-grid'
import { isSupportedLocale } from '../../../lib/locales'
import { photos } from '../../../lib/photos'

const copy: Record<
  SupportedLocale,
  {
    title: string
    description: string
    noteBefore: string
    noteLink: string
    toggleLabel: string
  }
> = {
  en: {
    title: 'Photos',
    description: 'Photos by Anthony Fu.',
    noteBefore: 'Thank you for being interested in my photos. You can find the tools I use',
    noteLink: 'here',
    toggleLabel: 'Toggle photo layout',
  },
  ru: {
    title: 'Фото',
    description: 'Фотографии Anthony Fu.',
    noteBefore: 'Спасибо за интерес к моим фотографиям. Список техники, которую я использую, можно найти',
    noteLink: 'здесь',
    toggleLabel: 'Переключить вид галереи',
  },
  es: {
    title: 'Fotos',
    description: 'Fotos de Anthony Fu.',
    noteBefore: 'Gracias por interesarte por estas fotos. Puedes encontrar las herramientas que uso',
    noteLink: 'aquí',
    toggleLabel: 'Cambiar diseño de fotos',
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

  useVisibleTask$(({ cleanup }) => {
    const saved = window.localStorage.getItem('antfu-gallery-view')
    if (saved === 'cover' || saved === 'contain')
      view.value = saved

    cleanup(() => {
      window.localStorage.setItem('antfu-gallery-view', view.value)
    })
  }, { strategy: 'document-ready' })

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
    <section class="mx-auto max-w-[125rem]">
      <div class="absolute left-6 top-20 flex flex-col items-center justify-center gap-1 sm:fixed">
        <button
          type="button"
          title={page.toggleLabel}
          aria-label={page.toggleLabel}
          class="rounded-full p-2 op20 transition-colors hover:bg-[#8881] hover:op100"
          onClick$={() => {
            view.value = view.value === 'cover' ? 'contain' : 'cover'
            window.localStorage.setItem('antfu-gallery-view', view.value)
          }}
        >
          <span
            aria-hidden="true"
            class={view.value === 'cover' ? 'i-ri-grid-line' : 'i-ri-layout-masonry-line'}
          />
        </button>
      </div>

      <div class="prose mx-auto">
        <h1>{page.title}</h1>
      </div>

      <div class="mt-[-2.5rem]">
        <PhotoGrid photos={data.photos} view={view.value} />
      </div>

      <div class="prose mx-auto mt-10">
        <div>
          <em class="op50">
            {page.noteBefore}
            {' '}
            <Link href={`/${data.locale}/use`}>{page.noteLink}</Link>
            .
          </em>
        </div>
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

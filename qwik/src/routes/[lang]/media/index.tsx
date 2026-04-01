import type { DocumentHead } from '@qwik.dev/router'
import type { MediaRecord, MediaType } from '../../../../../data/media'
import type { SupportedLocale } from '../../../lib/locales'
import { component$ } from '@qwik.dev/core'
import { Link, useLocation } from '@qwik.dev/router'
import { media } from '../../../../../data/media'
import { isSupportedLocale } from '../../../lib/locales'

const mediaTypes = Object.keys(media) as MediaType[]

const copy: Record<
  SupportedLocale,
  {
    title: string
    description: string
    intro: string[]
    outro: string
  }
> = {
  en: {
    title: 'Media Consumption',
    description: 'Anthony\'s Media Consumption',
    intro: [
      'One\'s life span is around 29,000 days, or 696,000 hours.',
      'Media consumption is a rather large chunk of my life, that more or less shapes the view I have today. While we can\'t live every lifestyle we dream of or experience everything we desire, media offers us a window into different stories and ways of life.',
      'I wanted to list them out, for myself, for sharing, or just for the record.',
    ],
    outro: 'These are ones I enjoyed, not exhaustive. And not necessarily recommendations.',
  },
  ru: {
    title: 'Media Consumption',
    description: 'Список того, что Anthony Fu смотрит, читает и слушает.',
    intro: [
      'Жизнь человека длится примерно 29 000 дней, или 696 000 часов.',
      'Потребление медиа занимает большую часть моей жизни и во многом формирует мой взгляд на мир. Даже если мы не можем прожить все жизни, о которых мечтаем, медиа дают окно в чужие истории и способы жить.',
      'Мне хотелось собрать это в одном месте — для себя, для памяти и, возможно, для тех, кому это тоже интересно.',
    ],
    outro: 'Здесь только то, что мне понравилось. Список не исчерпывающий и не обязательно является рекомендацией.',
  },
  es: {
    title: 'Media Consumption',
    description: 'Lista de medios que Anthony Fu disfruta.',
    intro: [
      'La vida de una persona dura alrededor de 29.000 días, o 696.000 horas.',
      'Consumir medios ocupa una parte importante de mi vida y, en cierta medida, da forma a mi forma de ver el mundo. Aunque no podamos vivir todas las vidas que imaginamos, los medios nos abren una ventana a otras historias y formas de vivir.',
      'Quería reunirlos aquí, para mí, como registro y para compartirlos.',
    ],
    outro: 'Son cosas que disfruté. No es una lista exhaustiva ni necesariamente una recomendación.',
  },
}

function isMediaType(value: string | null): value is MediaType {
  return !!value && mediaTypes.includes(value as MediaType)
}

function renderRecord(record: MediaRecord) {
  return (
    <tr key={`${record.name}-${record.creator || ''}`} lang={record.lang}>
      <td class="pr-6">{record.name}</td>
      <td class="whitespace-nowrap text-right">{record.creator}</td>
      <td class="hidden pl-6 op70 lg:table-cell">{record.note}</td>
    </tr>
  )
}

export default component$(() => {
  const location = useLocation()

  if (!isSupportedLocale(location.params.lang)) {
    return (
      <section class="prose mx-auto max-w-3xl">
        <h1>Page not found</h1>
        <p>Unsupported locale.</p>
      </section>
    )
  }

  const locale = location.params.lang as SupportedLocale
  const requestedType = location.url.searchParams.get('type')
  const selectedType: MediaType = isMediaType(requestedType)
    ? requestedType
    : 'anime'
  const text = copy[locale]
  const selectedRecords = media[selectedType].filter((item: MediaRecord) => !item.state)

  return (
    <section class="mx-auto max-w-5xl">
      <div class="prose max-w-none">
        <h1>{text.title}</h1>
        {text.intro.map(paragraph => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div class="mt-8 font-mono">
        <nav aria-label="Media types" class="mb-6 flex flex-wrap gap-2">
          {mediaTypes.map(type => (
            <Link
              key={type}
              href={`/${locale}/media?type=${type}`}
              class={[
                'rounded px-3 py-1 no-underline border border-base',
                selectedType === type
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'hover:bg-black/3 dark:hover:bg-white/6',
              ]}
            >
              {type}
            </Link>
          ))}
        </nav>

        <div class="overflow-x-auto">
          <table class="w-full" lang="ja">
            <tbody>
              {selectedRecords.map((record: MediaRecord) => renderRecord(record))}
            </tbody>
          </table>
        </div>
      </div>

      <div class="prose mx-auto mt-10 max-w-4xl">
        <div class="op50">{text.outro}</div>
      </div>
    </section>
  )
})

export const head: DocumentHead = ({ params }) => {
  const locale = isSupportedLocale(params.lang)
    ? (params.lang as SupportedLocale)
    : 'en'
  const text = copy[locale]

  return {
    title: `${text.title} - Anthony Fu`,
    meta: [
      {
        name: 'description',
        content: text.description,
      },
    ],
  }
}

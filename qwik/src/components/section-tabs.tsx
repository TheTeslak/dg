import type { SupportedLocale } from '../lib/locales'
import { component$ } from '@qwik.dev/core'
import { Link } from '@qwik.dev/router'

interface SectionTabsProps {
  locale: SupportedLocale
  current: 'notes' | 'articles'
}

const labels = {
  en: {
    notes: 'Notes',
    articles: 'Articles',
  },
  ru: {
    notes: 'Заметки',
    articles: 'Статьи',
  },
  es: {
    notes: 'Notas',
    articles: 'Artículos',
  },
} as const

export const SectionTabs = component$<SectionTabsProps>(
  ({ locale, current }) => {
    const copy = labels[locale]

    return (
      <nav
        aria-label="Content sections"
        class="mb-8 flex flex-wrap gap-2 border-b border-base pb-4"
      >
        {([
          ['notes', copy.notes],
          ['articles', copy.articles],
        ] as const).map(([section, label]) => (
          <Link
            key={section}
            href={`/${locale}/${section}`}
            aria-current={current === section ? 'page' : undefined}
            class={[
              'rounded-full px-4 py-2 no-underline transition-colors',
              current === section
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'border border-base op80 hover:bg-black/3 hover:op100 dark:hover:bg-white/6',
            ]}
          >
            {label}
          </Link>
        ))}
      </nav>
    )
  },
)

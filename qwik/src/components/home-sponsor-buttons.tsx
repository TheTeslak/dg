import type { SupportedLocale } from '../lib/locales'
import { component$ } from '@qwik.dev/core'

interface HomeSponsorButtonsProps {
  locale: SupportedLocale
}

const copy: Record<
  SupportedLocale,
  {
    description: string
    ecosystem: string
    support: string
    afdian: string
    howItWorks: string
  }
> = {
  en: {
    description: 'If you enjoy my work and find it useful, consider supporting me and the ecosystem to help Open Source stay sustainable. Thank you!',
    ecosystem: 'Sponsor the Ecosystem',
    support: 'Sponsor Anthony Fu',
    afdian: 'Support on Afdian',
    howItWorks: 'How does this work?',
  },
  ru: {
    description: 'Если вам нравится моя работа и вы находите её полезной, поддержите меня и экосистему, чтобы Open Source оставался устойчивым. Спасибо!',
    ecosystem: 'Поддержать экосистему',
    support: 'Поддержать Anthony Fu',
    afdian: 'Поддержать на Afdian',
    howItWorks: 'Как это работает?',
  },
  es: {
    description: 'Si disfrutas de mi trabajo y te resulta útil, considera apoyar tanto mi trabajo como el ecosistema para ayudar a que el Open Source sea sostenible. Gracias.',
    ecosystem: 'Patrocinar el ecosistema',
    support: 'Patrocinar a Anthony Fu',
    afdian: 'Apoyar en Afdian',
    howItWorks: '¿Cómo funciona esto?',
  },
}

export const HomeSponsorButtons = component$<HomeSponsorButtonsProps>(
  ({ locale }) => {
    const text = copy[locale]

    return (
      <>
        <p>{text.description}</p>

        <p class="flex flex-wrap items-center gap-2">
          <a
            href="https://opencollective.com/antfu"
            target="_blank"
            rel="noopener noreferrer"
            class="group btn-rose inline-flex items-center gap-2 p2 px3 pr2 text-base"
          >
            <span
              aria-hidden="true"
              class="i-ph-hand-heart-duotone transition-all duration-200 ease-out group-hover:i-ph-hand-heart-fill group-hover:text-rose"
            />
            {text.ecosystem}
          </a>

          <span class="text-sm op50">
            <a href="/en/articles/sponsorship-forwarding" target="_blank" rel="noopener noreferrer">
              {text.howItWorks}
            </a>
          </span>
        </p>

        <p class="flex flex-wrap gap-2">
          <a
            href="https://github.com/sponsors/antfu"
            target="_blank"
            rel="noopener noreferrer"
            class="group btn-rose inline-flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              class="i-ph-heart-duotone transition-all duration-200 ease-out group-hover:i-ph-heart-fill group-hover:text-rose"
            />
            {text.support}
          </a>

          <a
            href="https://afdian.com/a/antfu"
            target="_blank"
            rel="noopener noreferrer"
            class="group btn-yellow inline-flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              class="i-ph-lightning-duotone transition-all duration-200 ease-out group-hover:i-ph-lightning-fill group-hover:text-yellow"
            />
            {text.afdian}
          </a>
        </p>
      </>
    )
  },
)

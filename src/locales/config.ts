/**
 * Localization architecture:
 *
 * - The URL locale controls UI messages, dates, navigation, and document language.
 * - Article content locale comes from its physical `pages/<locale>/articles` file.
 * - UI-message fallback and article-content fallback are independent.
 * - Matching article slugs across locale folders identify translations.
 * - Missing translations use route aliases while keeping the requested URL locale.
 * - Only `/` and `/index.html` negotiate a locale from the cookie or Accept-Language.
 *
 * Related implementation:
 * - `negotiation.ts`: initial locale selection
 * - `../logics/i18n-path.ts`: locale-aware paths
 * - `../../build/article.ts`: article translation and fallback selection
 * - `../../vite.config.ts`: public article routes and fallback aliases
 */
export const defaultLocale = 'en' as const
// Article fallback stays English even if the neutral site's default locale changes later.
export const articleFallbackLocale = 'en' as const
export const LOCALE_COOKIE_NAME = 'site-locale'

export const localeConfig = {
  en: {
    nativeName: 'English',
    siteName: 'Teslak Realm',
    languageTag: 'en',
    dateLocale: 'en',
    ogLocale: 'en_US',
    messageFallbackLocales: ['ru'],
    feedTitle: 'Teslak En',
    feedDescription: 'Teslak\'s Blog',
    feedReaderNote: 'Reading on the site offers a better experience than in a feed reader.',
    sourcesLabel: 'Sources',
    minuteAbbreviation: 'min',
  },
  ru: {
    nativeName: 'Русский',
    siteName: 'Обитель Теслака',
    languageTag: 'ru',
    dateLocale: 'ru',
    ogLocale: 'ru_RU',
    messageFallbackLocales: ['en'],
    feedTitle: 'Teslak Ru',
    feedDescription: 'Блог Teslak',
    feedReaderNote: 'На сайте читать удобнее, чем в фид-ридере.',
    sourcesLabel: 'Источники',
    minuteAbbreviation: 'мин',
  },
  es: {
    nativeName: 'Español',
    siteName: 'Guarida Teslak',
    languageTag: 'es',
    dateLocale: 'es',
    ogLocale: 'es_ES',
    messageFallbackLocales: ['en', 'ru'],
    feedTitle: 'Teslak Es',
    feedDescription: 'Blog de Teslak',
    feedReaderNote: 'Leer en el sitio ofrece una mejor experiencia que en un lector de feeds.',
    sourcesLabel: 'Fuentes',
    minuteAbbreviation: 'min',
  },
  pt: {
    nativeName: 'Português',
    siteName: 'Reduto Teslak',
    // The public route stays short while metadata identifies the Brazilian variant.
    languageTag: 'pt-BR',
    dateLocale: 'pt-br',
    ogLocale: 'pt_BR',
    messageFallbackLocales: ['en', 'ru'],
    feedTitle: 'Teslak Pt',
    feedDescription: 'Blog do Teslak',
    feedReaderNote: 'A leitura no site oferece uma experiência melhor do que em um leitor de feeds.',
    sourcesLabel: 'Fontes',
    minuteAbbreviation: 'min',
  },
  de: {
    nativeName: 'Deutsch',
    siteName: 'Teslak Refugium',
    languageTag: 'de',
    dateLocale: 'de',
    ogLocale: 'de_DE',
    messageFallbackLocales: ['en', 'ru'],
    feedTitle: 'Teslak De',
    feedDescription: 'Teslaks Blog',
    feedReaderNote: 'Das Lesen auf der Website bietet eine bessere Erfahrung als in einem Feedreader.',
    sourcesLabel: 'Quellen',
    minuteAbbreviation: 'Min.',
  },
  fr: {
    nativeName: 'Français',
    siteName: 'L\'Antre Teslak',
    languageTag: 'fr',
    dateLocale: 'fr',
    ogLocale: 'fr_FR',
    messageFallbackLocales: ['en', 'ru'],
    feedTitle: 'Teslak Fr',
    feedDescription: 'Blog de Teslak',
    feedReaderNote: 'La lecture sur le site offre une meilleure expérience que dans un lecteur de flux.',
    sourcesLabel: 'Sources',
    minuteAbbreviation: 'min',
  },
} as const

export type SupportedLocale = keyof typeof localeConfig

export const supportedLocales = Object.keys(localeConfig) as SupportedLocale[]

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const localeSegmentPattern = supportedLocales
  .map(escapeRegExp)
  .join('|')

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return Object.hasOwn(localeConfig, locale)
}

export function resolveSupportedLocale(locale: string): SupportedLocale | undefined {
  const normalized = locale.trim().toLowerCase().replace(/_/g, '-')
  if (isSupportedLocale(normalized))
    return normalized

  const baseLocale = normalized.split('-')[0]
  return isSupportedLocale(baseLocale) ? baseLocale : undefined
}

export function getFeedName(locale: SupportedLocale) {
  return locale === defaultLocale ? 'feed' : `feed-${locale}`
}

export function getMessageFallbackOrder(locale: SupportedLocale): SupportedLocale[] {
  // Missing UI strings may fall back without changing the language or URL of article content.
  const configuredFallbacks = localeConfig[locale].messageFallbackLocales.filter(isSupportedLocale)
  return [...new Set([locale, ...configuredFallbacks])]
}

export function getLanguageTag(locale: SupportedLocale) {
  return localeConfig[locale].languageTag
}

export function getDateLocale(locale: SupportedLocale) {
  return localeConfig[locale].dateLocale
}

export function isSupportedLanguageTag(languageTag: string) {
  return supportedLocales.some(
    locale => localeConfig[locale].languageTag.toLowerCase() === languageTag.toLowerCase(),
  )
}

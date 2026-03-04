export const supportedLocales = ['en', 'ru', 'es'] as const

export type SupportedLocale = typeof supportedLocales[number]

const localePrefixRE = /^\/(en|ru|es)(?=\/|$)/

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale)
}

export function getLocaleFromPath(path: string): SupportedLocale {
  const match = path.match(localePrefixRE)
  return (match?.[1] as SupportedLocale) || 'en'
}

export function setPathLocale(path: string, locale: SupportedLocale): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (localePrefixRE.test(normalizedPath))
    return normalizedPath.replace(localePrefixRE, `/${locale}`)

  if (normalizedPath === '/')
    return `/${locale}`

  return `/${locale}${normalizedPath}`
}

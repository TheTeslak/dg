const supportedLocales = ['en', 'ru', 'es']
const defaultLocale = 'en'

export const config = {
  matcher: '/',
}

function getPreferredLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage)
    return defaultLocale

  const langs = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, qPart] = part.trim().split(';')
      const q = qPart ? Number.parseFloat(qPart.replace('q=', '')) : 1
      return { lang: lang.split('-')[0].toLowerCase(), q }
    })
    .sort((a, b) => b.q - a.q)

  for (const { lang } of langs) {
    if (supportedLocales.includes(lang))
      return lang
  }

  return defaultLocale
}

export default function middleware(request: Request) {
  const locale = getPreferredLocale(request.headers.get('accept-language'))
  return Response.redirect(new URL(`/${locale}`, request.url), 307)
}

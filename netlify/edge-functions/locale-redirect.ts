import { LOCALE_COOKIE_NAME } from '../../src/locales/config'
import { negotiateLocale } from '../../src/locales/negotiation'

interface EdgeContext {
  cookies: {
    get: (name: string) => string | undefined
  }
}

export const config = {
  // Only neutral entry routes are negotiated so explicit locale URLs stay stable and shareable.
  path: ['/', '/index.html'],
}

export default function localeRedirect(request: Request, context: EdgeContext) {
  const locale = negotiateLocale(
    context.cookies.get(LOCALE_COOKIE_NAME),
    request.headers.get('accept-language'),
  )
  const target = new URL(request.url)
  target.pathname = `/${locale}`
  return Response.redirect(target, 307)
}

export const siteOrigin = 'https://antfu.me'

export function getCanonicalUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return new URL(normalizedPath, siteOrigin).toString()
}

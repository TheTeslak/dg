export const siteOrigin = 'https://teslak.me'

export function getCanonicalUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return new URL(normalizedPath, siteOrigin).toString()
}

export function absoluteUrl(value: string | undefined) {
  if (!value)
    return undefined
  return new URL(value, siteOrigin).toString()
}

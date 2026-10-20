export interface PhotoEntry {
  file: string
  /** Stable reference for articles; defaults to the relative filename without extension. */
  id?: string
  text?: string
  lang?: string
  rating?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
}

export interface PhotoMetadata {
  sourceHash: string
  blurhash: string
}

export interface PhotoCache {
  version: number
  images: Record<string, PhotoMetadata>
}

export interface Photo extends PhotoEntry {
  name: string
  url: string
  blurhash?: string
}

// Keep the literal Vite glob in data.ts aligned with this pattern.
export const photoExtension = /\.(?:jpe?g|png|webp|avif)$/i
export const photoCacheVersion = 1

export function photoId(entry: PhotoEntry): string {
  return entry.id ?? entry.file.replace(photoExtension, '')
}

export function validateCatalog(entries: PhotoEntry[]): void {
  const files = new Set<string>()
  const ids = new Set<string>()
  for (const entry of entries) {
    const { file } = entry
    if (typeof file !== 'string' || !photoExtension.test(file)
      || file.startsWith('/') || file.includes('\\') || /[?#]/.test(file)
      || file.split('/').some(part => !part || part === '.' || part === '..')) {
      throw new Error(`[photos] Invalid relative image path: ${file}`)
    }
    const id = photoId(entry)
    if (typeof id !== 'string' || !id.trim() || id !== id.trim() || id.includes(','))
      throw new Error(`[photos] Invalid photo ID: ${id}`)
    if (files.has(file) || ids.has(id))
      throw new Error(`[photos] Duplicate file or ID: ${file} (${id})`)
    files.add(file)
    ids.add(id)
    if (entry.rating !== undefined && (!Number.isInteger(entry.rating) || entry.rating < 1 || entry.rating > 10))
      throw new Error(`[photos] Rating must be an integer from 1 to 10: ${file}`)
    for (const field of ['text', 'lang'] as const) {
      if (entry[field] !== undefined && typeof entry[field] !== 'string')
        throw new Error(`[photos] ${field} must be a string: ${file}`)
    }
    if (entry.lang !== undefined) {
      try {
        if (!entry.lang || !Intl.getCanonicalLocales(entry.lang).length)
          throw new Error('Empty language')
      }
      catch {
        throw new Error(`[photos] Invalid language tag: ${file}`)
      }
    }
  }
}

export function assemblePhotos(entries: PhotoEntry[], urls: Record<string, string>, cache: PhotoCache): Photo[] {
  validateCatalog(entries)
  if (cache.version !== photoCacheVersion)
    throw new Error('[photos] Outdated metadata. Run pnpm photos.')
  return entries.map((entry) => {
    const url = urls[`./${entry.file}`]
    if (!url)
      throw new Error(`[photos] Missing image: ${entry.file}`)
    const metadata = Object.hasOwn(cache.images, entry.file) ? cache.images[entry.file] : undefined
    if (!metadata)
      throw new Error(`[photos] Missing metadata for ${entry.file}. Run pnpm photos.`)
    return { ...entry, name: photoId(entry), url, blurhash: metadata.blurhash }
  })
}

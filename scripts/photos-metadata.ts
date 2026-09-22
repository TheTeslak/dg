import type { PhotoCache, PhotoEntry, PhotoMetadata } from '../photos/model'
import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import { encode, isBlurhashValid } from 'blurhash'
import fg from 'fast-glob'
import sharp from 'sharp'
import { photoCacheVersion, photoExtension, validateCatalog } from '../photos/model'

function validMetadata(value: unknown): value is PhotoMetadata {
  if (!value || typeof value !== 'object')
    return false
  const entry = value as Partial<PhotoMetadata>
  return typeof entry.sourceHash === 'string' && /^[a-f\d]{64}$/.test(entry.sourceHash)
    && typeof entry.blurhash === 'string' && isBlurhashValid(entry.blurhash).result
}

export async function processPhotos(folder: string, entries: PhotoEntry[], check = false) {
  validateCatalog(entries)
  const cachePath = join(folder, 'generated.json')
  let previous = ''
  try {
    previous = await fs.readFile(cachePath, 'utf8')
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      throw error
  }
  let cache: PhotoCache = { version: photoCacheVersion, images: {} }
  if (previous) {
    try {
      const parsed = JSON.parse(previous)
      if (parsed?.version === photoCacheVersion && parsed.images && typeof parsed.images === 'object' && !Array.isArray(parsed.images))
        cache = parsed
    }
    catch {
      // A generated cache can be rebuilt; check mode reports it as stale below.
    }
  }
  const listed = new Set(entries.map(entry => entry.file))
  const files = (await fg('**/*', { cwd: folder, onlyFiles: true })).filter(file => photoExtension.test(file))
  for (const file of files) {
    if (!listed.has(file))
      console.warn(`[photos] Not in catalog (not displayed): ${file}`)
  }
  const images: Record<string, PhotoMetadata> = Object.create(null)
  let generated = 0
  for (const file of [...listed].sort()) {
    if (!files.includes(file))
      throw new Error(`[photos] Missing image: ${file}`)
    const buffer = await fs.readFile(join(folder, file))
    const sourceHash = createHash('sha256').update(buffer).digest('hex')
    const cached = Object.hasOwn(cache.images, file) ? cache.images[file] : undefined
    if (validMetadata(cached) && cached.sourceHash === sourceHash) {
      images[file] = cached
      continue
    }
    if (check)
      throw new Error(`[photos] Missing or stale metadata: ${file}. Run pnpm photos.`)
    // Apply EXIF orientation before computing a placeholder for the displayed image.
    const { data, info } = await sharp(buffer)
      .rotate()
      .toColourspace('srgb')
      .resize(32, 32, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    images[file] = {
      sourceHash,
      blurhash: encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4),
    }
    generated++
  }
  const output = `${JSON.stringify({ version: photoCacheVersion, images }, null, 2)}\n`
  const changed = output !== previous
  if (check && changed)
    throw new Error('[photos] Metadata cache is outdated. Run pnpm photos.')
  if (!check && changed) {
    const temporary = `${cachePath}.${randomUUID()}.tmp`
    try {
      await fs.writeFile(temporary, output, { flag: 'wx' })
      await fs.rename(temporary, cachePath)
    }
    finally {
      await fs.rm(temporary, { force: true })
    }
  }
  return { count: entries.length, generated, changed }
}

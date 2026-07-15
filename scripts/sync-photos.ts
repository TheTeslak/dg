/**
 * Copies the photo library (jpg + json sidecars) into src/assets/photos so
 * Astro's image pipeline can pick it up. The binaries are intentionally not
 * committed — point PHOTOS_SOURCE at the folder that holds them
 * (defaults to ../dg/photos, the original repository).
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { basename, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import fg from 'fast-glob'
import fs from 'fs-extra'

const target = resolve('src/assets/photos')
const execFileAsync = promisify(execFile)

async function resolveSource() {
  const explicit = process.env.PHOTOS_SOURCE && resolve(process.env.PHOTOS_SOURCE)
  const localCandidates = [explicit, resolve('photos'), resolve('../dg/photos')].filter(Boolean) as string[]
  const local = localCandidates.find(candidate => fs.pathExistsSync(candidate))
  if (local)
    return { source: local }

  const repository = process.env.PHOTOS_REPOSITORY || 'https://github.com/TheTeslak/dg.git'
  const ref = process.env.PHOTOS_REF || 'main'
  const checkout = await fs.mkdtemp(resolve(tmpdir(), 'dg-photos-'))
  console.log(`[Photos] Local source not found; fetching photos from ${repository} (${ref}).`)
  try {
    await execFileAsync('git', [
      'clone', '--depth', '1', '--filter=blob:none', '--sparse', '--branch', ref,
      repository, checkout,
    ])
    await execFileAsync('git', ['-C', checkout, 'sparse-checkout', 'set', 'photos'])
    return { source: resolve(checkout, 'photos'), cleanup: () => fs.remove(checkout) }
  }
  catch (error) {
    await fs.remove(checkout)
    throw error
  }
}

async function run() {
  const { source, cleanup } = await resolveSource()

  try {
    await fs.ensureDir(target)
    const files = await fg('*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,avif,json}', { cwd: source, absolute: true })
    const images = files.filter(file => !file.endsWith('.json'))
    if (!images.length)
      throw new Error(`[Photos] No images found in ${source}.`)

    const sourceNames = new Set(files.map(file => basename(file)))
    const existing = await fg('*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,avif,json}', { cwd: target, absolute: true })
    for (const file of existing) {
      if (!sourceNames.has(basename(file)))
        await fs.remove(file)
    }

    let copied = 0
    for (const file of files) {
      const destination = resolve(target, basename(file))
      const [sourceStat, destinationStat] = await Promise.all([
        fs.stat(file),
        fs.stat(destination).catch(() => undefined),
      ])
      if (!destinationStat || destinationStat.size !== sourceStat.size) {
        await fs.copy(file, destination)
        copied++
      }
    }
    console.log(`[Photos] ${images.length} images ready (${copied} file(s) copied) → src/assets/photos`)
  }
  finally {
    await cleanup?.()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

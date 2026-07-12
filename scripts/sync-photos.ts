/**
 * Copies the photo library (jpg + json sidecars) into src/assets/photos so
 * Astro's image pipeline can pick it up. The binaries are intentionally not
 * committed — point PHOTOS_SOURCE at the folder that holds them
 * (defaults to ../dg/photos, the original repository).
 */
import { basename, resolve } from 'node:path'
import fg from 'fast-glob'
import fs from 'fs-extra'

const source = resolve(process.env.PHOTOS_SOURCE || '../dg/photos')
const target = resolve('src/assets/photos')

async function run() {
  if (!await fs.pathExists(source)) {
    console.error(`[Photos] Source folder not found: ${source}\nSet PHOTOS_SOURCE=/path/to/photos and re-run.`)
    process.exit(1)
  }

  await fs.ensureDir(target)
  const files = await fg('*.{jpg,JPG,png,PNG,webp,avif,json}', { cwd: source, absolute: true })
  let copied = 0
  for (const file of files) {
    await fs.copy(file, resolve(target, basename(file)))
    copied++
  }
  console.log(`[Photos] Copied ${copied} files → src/assets/photos`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

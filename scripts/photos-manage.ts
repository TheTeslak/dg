import { fileURLToPath } from 'node:url'
import { catalog } from '../photos/catalog'
import { processPhotos } from './photos-metadata'

const args = process.argv.slice(2)
if (args.some(arg => arg !== '--check'))
  throw new Error('Usage: pnpm photos [--check]')

const check = args.includes('--check')
const folder = fileURLToPath(new URL('../photos', import.meta.url))
const result = await processPhotos(folder, catalog, check)
console.log(`[photos] ${result.count} photos ${check ? 'checked' : `ready; ${result.generated} generated`}.`)

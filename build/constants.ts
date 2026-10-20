import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'

export { supportedLocales } from '../src/locales/config.ts'
export type { SupportedLocale } from '../src/locales/config.ts'

export const contentSourceDirectory = '(content)'
export const supportedOgSourceExtensions = ['avif', 'webp', 'png', 'jpg', 'jpeg'] as const
export const supportedAudioExtensions = ['.m4a', '.opus', '.ogg', '.mp3', '.wav'] as const

export const frontmatterKnownKeys = new Set([
  'ai',
  'art',
  'audio',
  'availableLocales',
  'backlink',
  'class',
  'date',
  'description',
  'display',
  'draft',
  'duration',
  'excerpt',
  'hashtags',
  'image',
  'items',
  'lang',
  'link',
  'twitter',
  'originalLocale',
  'open',
  'pic',
  'place',
  'placeLink',
  'projects',
  'recording',
  'redirect',
  'robots',
  'sources',
  'subtitle',
  'tags',
  'telegram',
  'title',
  'tocAlwaysOn',
  'type',
  'updated',
  'wrapperClass',
])

const currentDir = dirname(fileURLToPath(import.meta.url))
const audioMetadataPath = resolve(currentDir, '../data/audio-metadata.json')
export const audioMetadata: Record<string, { url: string, duration: string, durationSeconds: number, format: string }>
  = fs.existsSync(audioMetadataPath) ? fs.readJSONSync(audioMetadataPath) : {}

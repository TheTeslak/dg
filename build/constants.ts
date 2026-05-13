import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'

export const supportedLocales = ['en', 'ru', 'es'] as const
export type SupportedLocale = typeof supportedLocales[number]

export const supportedOgSourceExtensions = ['avif', 'webp', 'png', 'jpg', 'jpeg'] as const
export const supportedAudioExtensions = ['.m4a', '.opus', '.ogg', '.mp3', '.wav'] as const

export const frontmatterKnownKeys = new Set([
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
  'mastodon',
  'originalLocale',
  'place',
  'placeLink',
  'projects',
  'recording',
  'redirect',
  'sources',
  'subtitle',
  'tags',
  'telegram',
  'title',
  'tocAlwaysOn',
  'type',
  'upcoming',
  'updated',
  'wrapperClass',
])

const currentDir = dirname(fileURLToPath(import.meta.url))
const audioMetadataPath = resolve(currentDir, '../data/audio-metadata.json')
export const audioMetadata: Record<string, { url: string, duration: string, durationSeconds: number, format: string }>
  = fs.existsSync(audioMetadataPath) ? fs.readJSONSync(audioMetadataPath) : {}

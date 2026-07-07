/**
 * Audio metadata processor for articles.
 *
 * Scans articles in `pages/<locale>/articles/` that have `audio: true`
 * (or an explicit `audio` object), locates the corresponding audio file
 * under `public/audio/<locale>/`, reads its duration with
 * `music-metadata`, and writes a small JSON cache to `data/audio-metadata.json`.
 *
 * The Vite build then reads this cache to expand `audio: true` shortcuts
 * into the full `ArticleAudio` object without reparsing binaries at dev time.
 *
 * Usage:
 *   pnpm run process-audio
 */

import { resolve } from 'node:path'
import fs from 'fs-extra'
import matter from 'gray-matter'
import * as mm from 'music-metadata'
import { supportedLocales } from '../src/locales/config'

const audioExtensions = ['.m4a', '.opus', '.ogg', '.mp3', '.wav'] as const

interface AudioMeta {
  url: string
  duration: string
  durationSeconds: number
  format: string
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hours > 0)
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

async function main() {
  const root = resolve(import.meta.dirname, '..')
  const metadata: Record<string, AudioMeta> = {}
  let found = 0
  let warnings = 0

  for (const locale of supportedLocales) {
    const articlesDir = resolve(root, `pages/${locale}/articles`)
    if (!fs.existsSync(articlesDir))
      continue

    for (const file of fs.readdirSync(articlesDir)) {
      if (!file.endsWith('.md') || file.startsWith('['))
        continue

      const slug = file.replace(/\.md$/, '')
      const filePath = resolve(articlesDir, file)
      const { data } = matter(fs.readFileSync(filePath, 'utf-8'))

      // Only process articles that use the audio feature
      const hasAudioShortcut = data.audio === true
      const hasAudioObject = data.audio && typeof data.audio === 'object' && !Array.isArray(data.audio)

      if (!hasAudioShortcut && !hasAudioObject)
        continue

      // Find audio file in priority order: m4a → opus → ogg → mp3 → wav
      const audioDir = resolve(root, `public/audio/${locale}`)
      let audioFile: string | undefined
      let audioExt: string | undefined

      for (const ext of audioExtensions) {
        const candidate = resolve(audioDir, `${slug}${ext}`)
        if (fs.existsSync(candidate)) {
          audioFile = candidate
          audioExt = ext
          break
        }
      }

      if (!audioFile) {
        console.warn(`⚠ ${locale}/${slug}: audio enabled but no file found in public/audio/${locale}/`)
        warnings++
        continue
      }

      // Extract duration from audio file
      try {
        const parsed = await mm.parseFile(audioFile)
        const durationSeconds = parsed.format.duration || 0
        const key = `${locale}/${slug}`

        metadata[key] = {
          url: `/audio/${locale}/${slug}${audioExt}`,
          duration: formatDuration(durationSeconds),
          durationSeconds: Math.round(durationSeconds * 10) / 10,
          format: audioExt!.slice(1),
        }

        found++
        console.log(`✓ ${key}: ${metadata[key].duration} (${metadata[key].format})`)
      }
      catch (e) {
        console.error(`✗ ${locale}/${slug}: failed to parse audio —`, e)
        warnings++
      }
    }
  }

  // Write cache
  const outputPath = resolve(root, 'data/audio-metadata.json')
  await fs.ensureDir(resolve(root, 'data'))
  await fs.writeJSON(outputPath, metadata, { spaces: 2 })

  console.log(`\nDone: ${found} audio file(s) processed, ${warnings} warning(s).`)
  console.log(`Cache written to data/audio-metadata.json`)
}

main().catch(console.error)

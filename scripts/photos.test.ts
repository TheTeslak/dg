import type { PhotoEntry } from '../photos/model'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// Native Node test runner; no additional test dependency is needed.
// eslint-disable-next-line test/no-import-node-test
import { it } from 'node:test'
import sharp from 'sharp'
import { assemblePhotos, photoId, validateCatalog } from '../photos/model'
import { processPhotos } from './photos-metadata'

it('catalog order, optional metadata and stable IDs survive format changes', () => {
  const entries: PhotoEntry[] = [{ file: 'second.avif' }, { file: 'first.jpg', rating: 5 }]
  const cache = { version: 1, images: { 'second.avif': { sourceHash: '', blurhash: '' }, 'first.jpg': { sourceHash: '', blurhash: '' } } }
  const photos = assemblePhotos(entries, { './first.jpg': '/one', './second.avif': '/two' }, cache)
  assert.deepEqual(photos.map(photo => photo.name), ['second', 'first'])
  assert.equal(photoId({ file: 'second.jpg' }), photos[0].name)
  assert.equal(photoId({ file: 'renamed.avif', id: 'second' }), photos[0].name)
  assert.throws(() => assemblePhotos(entries, {}, cache), /Missing image/)
  assert.throws(() => assemblePhotos(entries, { './second.avif': '/two' }, { version: 1, images: {} }), /Missing metadata/)
})

it('catalog rejects ambiguous IDs, invalid ratings and unsafe paths', () => {
  assert.throws(() => validateCatalog([{ file: 'a.jpg' }, { file: 'a.avif' }]), /Duplicate/)
  assert.throws(() => validateCatalog([{ file: 'a.jpg' }, { file: 'b.jpg', id: 'a' }]), /Duplicate/)
  assert.throws(() => validateCatalog([{ file: '../a.jpg' }]), /Invalid relative/)
  assert.throws(() => validateCatalog([{ file: 'a.jpg', rating: 11 } as unknown as PhotoEntry]), /Rating/)
  assert.throws(() => validateCatalog([{ file: 'a.jpg', lang: 'not_a_tag' }]), /language tag/)
  validateCatalog([{ file: 'Угли 1.JpEg', lang: 'ru' }])
})

it('generation handles formats, preserves inputs and is incremental, atomic and checkable', async () => {
  const folder = await fs.mkdtemp(join(tmpdir(), 'photos-test-'))
  try {
    const source = sharp({ create: { width: 48, height: 24, channels: 3, background: '#ff3300' } })
    const entries = ['Горы.JpEg', 'space name.png', 'tower.avif', 'image.webp'].map(file => ({ file }))
    for (const { file } of entries) {
      const ext = file.split('.').pop()?.toLowerCase()
      if (ext === 'jpeg' || ext === 'jpg')
        await source.clone().jpeg().toFile(join(folder, file))
      else
        await source.clone().toFile(join(folder, file))
    }
    const original = await fs.readFile(join(folder, entries[0].file))
    await assert.rejects(processPhotos(folder, entries, true), /Missing or stale/)
    assert.equal((await processPhotos(folder, entries)).generated, 4)
    const path = join(folder, 'generated.json')
    const first = await fs.readFile(path, 'utf8')
    const stat = await fs.stat(path)
    assert.equal((await processPhotos(folder, entries)).changed, false)
    assert.equal((await fs.stat(path)).mtimeMs, stat.mtimeMs)
    assert.equal((await processPhotos(folder, [...entries].reverse(), true)).changed, false)
    assert.deepEqual(await fs.readFile(join(folder, entries[0].file)), original)
    await sharp({ create: { width: 20, height: 40, channels: 3, background: '#0033ff' } }).png().toFile(join(folder, 'space name.png'))
    await assert.rejects(processPhotos(folder, entries, true), /stale metadata/)
    assert.equal(await fs.readFile(path, 'utf8'), first)
    assert.equal((await processPhotos(folder, entries)).generated, 1)
    const latest = await fs.readFile(path, 'utf8')
    await assert.rejects(processPhotos(folder, [...entries, { file: 'missing.jpg' }]), /Missing image/)
    assert.equal(await fs.readFile(path, 'utf8'), latest)
    await fs.writeFile(path, '{broken')
    await assert.rejects(processPhotos(folder, entries, true), /Missing or stale/)
    assert.equal((await processPhotos(folder, entries)).generated, 4)
    await fs.unlink(join(folder, 'image.webp'))
    await assert.rejects(processPhotos(folder, entries.slice(0, 3), true), /outdated/)
    await processPhotos(folder, entries.slice(0, 3))
    assert.equal(Object.keys(JSON.parse(await fs.readFile(path, 'utf8')).images).length, 3)
  }
  finally {
    await fs.rm(folder, { recursive: true, force: true })
  }
})

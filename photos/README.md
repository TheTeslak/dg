# Photos

`catalog.ts` is the manually edited list. Its array order is gallery order; ratings
never change that order. Only listed files appear in the gallery. Add an image to
this directory, add its exact relative filename to the catalog, then run
`pnpm photos`. Commit the image, catalog and `generated.json` together.

Supported formats: JPEG (`jpg`/`jpeg`), PNG, WebP and AVIF, with case-insensitive
extensions. Spaces, Unicode filenames and subdirectories are supported. Files
are never renamed, recompressed or deleted by the metadata command.

```ts
const photo = { file: 'osaka-night.jpg', text: '大阪 Osaka', lang: 'ja', rating: 5 }
```

Only `file` is required. `rating` is an integer from 1 to 10; absence means unrated.
`text` is the caption and accessible image text. When omitted, images receive an
empty alt attribute. `lang` is a language tag for that text, independent of the
page locale. Captions appear below slides and in the lightbox.

Article IDs default to the relative filename without its extension. Changing
`osaka-night.jpg` to `osaka-night.avif` preserves its ID. To rename the basename,
set `id: 'osaka-night'` before changing `file`. IDs must be unique. Two entries
with the same basename and different extensions need explicit distinct IDs.

```html
<PhotoShowcase ids="tower,mountains" mode="slide" />
<PhotoShowcase :limit="4" />
```

Explicit selections follow `ids` order. Without `ids`, catalog order applies.
Missing IDs fail rendering rather than silently omitting requested photos.

`generated.json` is a committed machine-generated cache, keyed by the complete
filename. SHA-256 detects replacements under the same name. The generator applies
EXIF orientation, converts to sRGB and preserves aspect ratio when making the
small blurhash input. It does not modify source images. Bump `photoCacheVersion`
in `model.ts` when changing the generation algorithm.

- `pnpm photos`: update missing/stale placeholders and prune unused cache entries.
- `pnpm check:photos`: read-only validation, also run before production builds.
- `pnpm test:photos`: isolated fixture tests, including JPEG/PNG/WebP/AVIF.

Unlisted image files produce warnings and are not added automatically. The
metadata file is replaced atomically only when its contents change. Reordering
the catalog does not rewrite this cache. Keep originals/backups outside this
folder: Vite discovers image assets here even when they are not listed.

## Planned AVIF conversion command (not implemented)

1. Accept explicit source files or a separate originals directory and an output
   directory. Default to a dry run showing dimensions, sizes and target paths.
2. Use the existing Sharp dependency; apply EXIF orientation and convert colour
   consistently before stripping private metadata. Preserve transparency. Reject
   animated inputs unless animation handling is explicitly designed.
3. Expose quality, effort and maximum dimensions; do not upscale. Choose defaults
   after comparing representative night shots, gradients, foliage and fine detail
   at full size, rather than relying on one universal quality value.
4. Bound concurrency and write each result to a temporary file. Decode and verify
   the resulting AVIF before its atomic final rename. Never overwrite an existing
   output or delete an original by default. Skip existing AVIF inputs.
5. Report size savings per image, including larger outputs and encoding failures.
   Do not replace sources when the output is larger without explicit intent.
6. Store source hashes plus encoder/settings versions in a separate conversion
   manifest so reruns skip unchanged work and changed settings regenerate output.
7. Keep conversion separate from publication: review results first, then change
   only `file` in the photo catalog, preserving IDs, order and manual fields.
   Run `pnpm photos`, `pnpm check:photos` and the build after switching files.
8. Decide separately whether older-client fallbacks and responsive image variants
   are needed; that requires a different asset model rather than silently adding
   a second gallery entry for the same photograph.

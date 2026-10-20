import { catalog } from './catalog'
import generated from './generated.json'
import { assemblePhotos } from './model'

export type { Photo } from './model'

// Case-insensitive extensions, including mixed case; keep aligned with model.ts.
const urls = import.meta.glob<string>('./**/*.{[jJ][pP][gG],[jJ][pP][eE][gG],[pP][nN][gG],[wW][eE][bB][pP],[aA][vV][iI][fF]}', {
  eager: true,
  query: '?url',
  import: 'default',
})

export default assemblePhotos(catalog, urls, generated)

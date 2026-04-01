import type { Photo } from '../lib/photos'
import { component$ } from '@qwik.dev/core'

interface PhotoGridProps {
  photos: Photo[]
  view: 'cover' | 'contain'
}

export const PhotoGrid = component$<PhotoGridProps>(({ photos, view }) => {
  return (
    <ul class="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {photos.map(photo => (
        <li key={photo.name}>
          <figure class="m-0">
            <img
              src={photo.url}
              alt={photo.text || 'Photo'}
              loading="lazy"
              decoding="async"
              class={[
                'w-full rounded-2xl bg-black/3',
                view === 'contain'
                  ? 'aspect-square object-contain'
                  : 'aspect-square object-cover',
              ]}
            />
            {photo.text
              ? (
                  <figcaption class="px-1 pt-2 text-sm op70">
                    {photo.text}
                  </figcaption>
                )
              : null}
          </figure>
        </li>
      ))}
    </ul>
  )
})

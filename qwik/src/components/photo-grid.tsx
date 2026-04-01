import type { Photo } from '../lib/photos'
import { component$ } from '@qwik.dev/core'
import { blurhashToGradientCssObject } from '@unpic/placeholder'

interface PhotoGridProps {
  photos: Photo[]
  view: 'cover' | 'contain'
}

export const PhotoGrid = component$<PhotoGridProps>(({ photos, view }) => {
  return (
    <div class="mx-auto grid max-w-[125rem] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {photos.map((photo, index) => (
        <div key={`${photo.name}-${index}`} class="photo-hover">
          <img
            src={photo.url}
            alt={photo.text || 'Photo'}
            loading="lazy"
            decoding="async"
            data-photo-index={index}
            style={photo.blurhash && view !== 'contain'
              ? blurhashToGradientCssObject(photo.blurhash) as unknown as Record<string, string>
              : undefined}
            class={[
              'w-full',
              view === 'contain'
                ? 'object-contain sm:aspect-square'
                : 'aspect-square object-cover',
            ]}
          />
        </div>
      ))}
    </div>
  )
})

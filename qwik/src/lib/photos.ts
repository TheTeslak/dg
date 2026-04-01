import rawPhotos from '../../../photos/data'

export type Photo = (typeof rawPhotos)[number]

export const photos = rawPhotos as Photo[]

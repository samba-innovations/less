import { createPhotoRoute } from '@/lib/photos-proxy'

export const dynamic = 'force-dynamic'
export const GET = createPhotoRoute({ prefixes: ['students/', 'teachers/'] })

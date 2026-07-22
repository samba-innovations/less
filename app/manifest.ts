import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'less',
    short_name:       'less',
    description:      'samba innovations — less',
    start_url:        '/dashboard',
    display:          'standalone',
    background_color: '#ffffff',
    theme_color:      '#b8860b',
    icons: [
      { src: '/identidade/less-isotipo1.svg', sizes: 'any',    type: 'image/svg+xml' },
      { src: '/favicon.ico',                        sizes: '32x32',  type: 'image/x-icon' },
    ],
  }
}

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['sambainnovations.local', '*.sambainnovations.local'],
}

export default nextConfig

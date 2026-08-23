import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'afgwpbrkliamiopciuic.supabase.co',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
  experimental: {
    authInterrupts: true,
    viewTransition: true,
    serverActions: {
      // Report photos are downscaled in the browser to under 2MB
      bodySizeLimit: '3mb',
    },
  },
  turbopack: {
    root: projectRoot,
  },
}

export default nextConfig

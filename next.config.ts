import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Required for `forbidden()` from next/navigation, which renders
    // `forbidden.tsx` with a 403 status. Still experimental in Next 16.
    authInterrupts: true,
  },
}

export default nextConfig

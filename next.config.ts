import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // A lockfile in ~ makes Turbopack pick the wrong workspace root, which breaks
  // loading .env from this project (including NEXT_PUBLIC_MAPBOX_TOKEN).
  turbopack: {
    root: projectRoot,
  },
}

export default nextConfig

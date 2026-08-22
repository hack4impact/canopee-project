import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ca.canopee.app',
  appName: 'Canopée',
  webDir: 'www',
  server: {
    url:
      process.env.CAPACITOR_SERVER_URL ?? 'https://canopee-project.vercel.app',
  },
}

export default config

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.reseaucanopee.app',
  appName: 'Canopée',
  webDir: 'www',
  server: {
    url:
      process.env.CAPACITOR_SERVER_URL ?? 'https://canopee-project.vercel.app',
    errorPath: 'index.html',
  },
  android: {
    useLegacyBridge: true,
  },
}

export default config

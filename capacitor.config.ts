import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.reseaucanopee.app',
  appName: 'Canopée',
  webDir: 'www',
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? 'https://app.reseaucanopee.org',
    errorPath: 'index.html',
  },
  ios: {
    backgroundColor: '#f6f4df',
  },
  android: {
    useLegacyBridge: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 10000,
      launchAutoHide: true,
      launchFadeOutDuration: 200,
      backgroundColor: '#f6f4df',
    },
  },
}

export default config

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.pomo.app',
  appName: 'Pomo',
  webDir: 'dist',
  // Match the app's dark background so there is no white flash on launch.
  backgroundColor: '#0a0a0e',
  android: {
    backgroundColor: '#0a0a0e',
  },
}

export default config

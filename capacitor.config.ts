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
  plugins: {
    LocalNotifications: {
      // Monochrome status-bar icon (white silhouette, system-tinted).
      smallIcon: 'ic_stat_pomo',
      iconColor: '#E8442F',
    },
  },
}

export default config

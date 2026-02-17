import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.aovault.vault',
  appName: 'AOVault',
  webDir: 'dist',
  server: {
    // For development - connects to your local backend
    // Your iPhone needs to be on the same WiFi network
    url: 'http://192.168.1.215:5173',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0d1117'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0d1117',
      showSpinner: false
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0d1117'
    }
  }
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.aovault.vault',
  appName: 'AOVault',
  webDir: 'dist',
  server: {
    // Allow cleartext HTTP to local backend
    cleartext: true,
    allowNavigation: ['192.168.1.*', '*.local', 'localhost']
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

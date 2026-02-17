// API Configuration
// In development, detect if we're running on mobile (Capacitor) or web

const getApiUrl = () => {
  // Check if we're in a Capacitor native app
  if (window.Capacitor?.isNativePlatform()) {
    // Use the network IP for mobile access
    return 'http://192.168.1.215:3001/api'
  }

  // For web development, use localhost
  return 'http://localhost:3001/api'
}

export const API_URL = getApiUrl()

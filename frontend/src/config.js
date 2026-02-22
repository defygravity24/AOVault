// API Configuration
// Network IP of your Mac — phone connects to this over WiFi
const NETWORK_API = 'http://192.168.1.215:3001/api'
const LOCAL_API = 'http://localhost:3001/api'
const PROD_API = 'https://aovault.onrender.com/api'

const getApiUrl = () => {
  // Capacitor native app (iOS/Android)
  if (window.Capacitor?.isNativePlatform()) {
    // Real device can't use localhost — needs network IP or production URL
    // Check if we have network connectivity to local backend
    return NETWORK_API
  }

  // Running in a regular browser
  const hostname = window.location.hostname

  // Production (aovault.net or render domain)
  if (hostname === 'aovault.net' || hostname === 'www.aovault.net' || hostname.includes('onrender.com')) {
    // Same-origin API — backend serves both frontend and API
    return `${window.location.origin}/api`
  }

  // If opened via network IP (e.g. phone browser on same WiFi)
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:3001/api`
  }

  // Local dev in browser
  return LOCAL_API
}

export const API_URL = getApiUrl()
console.log('[AOVault] API_URL:', API_URL, '| Capacitor:', !!window.Capacitor?.isNativePlatform?.())

// Authenticated fetch wrapper — attaches JWT if available
export const apiFetch = (url, options = {}) => {
  const token = localStorage.getItem('aovault_token')
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

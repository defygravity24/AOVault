// API Configuration
// Network IP of your Mac — phone connects to this over WiFi
const NETWORK_API = 'http://192.168.1.215:3001/api'
const LOCAL_API = 'http://localhost:3001/api'
const PROD_API = 'https://aovault.onrender.com/api'

const getApiUrl = () => {
  // Capacitor native app (iOS/Android)
  if (window.Capacitor?.isNativePlatform()) {
    // Production app uses the live server
    return 'https://www.aovault.net/api'
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

// Authenticated fetch wrapper — attaches JWT and handles session expiry
export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('aovault_token')
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  // If the server says our token is invalid, clear it and reload to the login screen
  if (response.status === 401 && token) {
    localStorage.removeItem('aovault_token')
    localStorage.removeItem('aovault_user')
    // Dispatch an event so any listening UI can react (e.g. show a toast)
    window.dispatchEvent(new CustomEvent('aovault:session-expired'))
    // Hard reload — AuthContext will see no token and show the login modal
    window.location.reload()
  }

  return response
}

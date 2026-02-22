import { createContext, useContext, useState, useEffect } from 'react'
import { API_URL, apiFetch } from '../config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('aovault_token'))
  const [loading, setLoading] = useState(true)

  // On mount, validate saved token
  useEffect(() => {
    if (token) {
      apiFetch(`${API_URL}/auth/me`)
        .then(res => res.json())
        .then(data => {
          if (data.user && !data.isGuest) {
            setUser(data.user)
            localStorage.setItem('aovault_user', JSON.stringify(data.user))
          } else {
            // Token invalid or guest — clear it
            localStorage.removeItem('aovault_token')
            setToken(null)
            setUser(null)
          }
        })
        .catch(() => {
          // Network error (offline) — trust the stored token instead of logging out
          // This lets users read cached fics without WiFi
          const savedUser = localStorage.getItem('aovault_user')
          if (savedUser) {
            try { setUser(JSON.parse(savedUser)) } catch { /* corrupt data — ignore */ }
          } else {
            // No saved user info, create a minimal offline placeholder
            setUser({ id: 0, username: 'offline', name: 'Offline Mode' })
          }
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const signup = async (username, password, name, email) => {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name, email }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Signup failed')

    localStorage.setItem('aovault_token', data.token)
    localStorage.setItem('aovault_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)

    // Migrate guest data to new account
    try {
      await fetch(`${API_URL}/auth/migrate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.token}` },
      })
    } catch {
      // Non-critical — guest data migration is best effort
    }

    return data
  }

  const login = async (username, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')

    localStorage.setItem('aovault_token', data.token)
    localStorage.setItem('aovault_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('aovault_token')
    localStorage.removeItem('aovault_user')
    setToken(null)
    setUser(null)
  }

  const isGuest = !user

  return (
    <AuthContext.Provider value={{ user, token, loading, isGuest, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

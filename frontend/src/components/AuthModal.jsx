import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { CloseIcon } from './Icons'

export default function AuthModal({ isOpen, onClose }) {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [username, setUsername] = useState(() => localStorage.getItem('aovault_last_user') || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        if (!username.trim()) {
          setError('Username is required')
          setLoading(false)
          return
        }
        await signup(username.trim(), password, name.trim() || null, email.trim() || null)
        localStorage.setItem('aovault_last_user', username.trim())
        toast.success('Account created! Your vault is ready.')
      } else {
        await login(username.trim(), password)
        localStorage.setItem('aovault_last_user', username.trim())
        toast.success('Welcome back!')
      }
      handleClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setUsername('')
    setEmail('')
    setPassword('')
    setName('')
    setError('')
    setMode('login')
    onClose?.()
  }

  const switchMode = () => {
    setMode(prev => prev === 'login' ? 'signup' : 'login')
    setError('')
  }

  if (!isOpen) return null

  // Inline mode (login screen) vs overlay mode (modal)
  const isInline = !onClose

  const card = (
    <div
      className="bg-vault-card border border-vault-border rounded-xl max-w-sm w-full p-6 shadow-vault-lg"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-vault-muted text-sm mt-1">
            {mode === 'login'
              ? 'Sign in to your vault.'
              : 'Create your vault account.'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-vault-bg text-vault-muted hover:text-vault-text transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div>
          <label className="block text-sm text-vault-muted mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError('') }}
            placeholder={mode === 'login' ? 'Your username' : 'Choose a username'}
            className="vault-input text-base w-full"
            autoFocus
            disabled={loading}
            required
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        {/* Display Name — signup only, optional */}
        {mode === 'signup' && (
          <div>
            <label className="block text-sm text-vault-muted mb-1">
              Display Name <span className="text-vault-muted/50">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              className="vault-input text-base w-full"
              disabled={loading}
            />
          </div>
        )}

        {/* Email — signup only, optional */}
        {mode === 'signup' && (
          <div>
            <label className="block text-sm text-vault-muted mb-1">
              Email <span className="text-vault-muted/50">(optional, for recovery)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="vault-input text-base w-full"
              disabled={loading}
            />
          </div>
        )}

        {/* Password */}
        <div>
          <label className="block text-sm text-vault-muted mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            placeholder={mode === 'signup' ? 'Create a password' : 'Your password'}
            className="vault-input text-base w-full"
            disabled={loading}
            required
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !username || !password}
          className="vault-btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {mode === 'login' ? 'Signing in...' : 'Creating account...'}
            </>
          ) : (
            mode === 'login' ? 'Sign In' : 'Create Account'
          )}
        </button>
      </form>

      {/* Switch mode */}
      <p className="text-center text-sm text-vault-muted mt-4">
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <button onClick={switchMode} className="text-accent-gold hover:underline">
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button onClick={switchMode} className="text-accent-gold hover:underline">
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  )

  // Inline mode: just return the card (used as login screen in App.jsx)
  if (isInline) return card

  // Modal mode: wrap card in overlay backdrop
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      {card}
    </div>
  )
}

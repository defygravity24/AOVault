import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Header from '../components/Header'
import FicCard from '../components/FicCard'
import { ArrowLeftIcon, HeartIcon } from '../components/Icons'
import { API_URL, apiFetch } from '../config'

export default function EliteVault() {
  const [locked, setLocked] = useState(true)
  const [hasPin, setHasPin] = useState(null)
  const [pin, setPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [settingPin, setSettingPin] = useState(false)
  const [fics, setFics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPinStatus()
  }, [])

  const checkPinStatus = async () => {
    try {
      const response = await apiFetch(`${API_URL}/elite-vault/status`)
      const data = await response.json()
      setHasPin(data.hasPin)

      // If no PIN set, show setup screen
      if (!data.hasPin) {
        setSettingPin(true)
        setLocked(true)
      }

      // Check session unlock
      if (data.hasPin && sessionStorage.getItem('elite_unlocked') === 'true') {
        setLocked(false)
        fetchEliteFics()
      }
    } catch (err) {
      console.error('Failed to check PIN status:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchEliteFics = async () => {
    try {
      const response = await apiFetch(`${API_URL}/elite-vault`)
      const data = await response.json()
      setFics(data.fics || [])
    } catch (err) {
      console.error('Failed to fetch elite fics:', err)
    }
  }

  const handleSetPin = async () => {
    if (newPin.length < 4) {
      toast.error('PIN must be at least 4 characters')
      return
    }
    if (newPin !== confirmPin) {
      toast.error('PINs do not match')
      return
    }

    try {
      await apiFetch(`${API_URL}/elite-vault/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      })
      setHasPin(true)
      setSettingPin(false)
      setLocked(false)
      sessionStorage.setItem('elite_unlocked', 'true')
      fetchEliteFics()
      toast.success('Elite Vault PIN set!')
    } catch (err) {
      toast.error('Failed to set PIN')
    }
  }

  const handleUnlock = async () => {
    try {
      const response = await apiFetch(`${API_URL}/elite-vault/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await response.json()

      if (data.valid) {
        setLocked(false)
        sessionStorage.setItem('elite_unlocked', 'true')
        fetchEliteFics()
        toast.success('Welcome to the Elite Vault')
      } else {
        toast.error('Incorrect PIN')
        setPin('')
      }
    } catch (err) {
      toast.error('Failed to verify PIN')
    }
  }

  const handleRemoveFromElite = async (ficId) => {
    try {
      await apiFetch(`${API_URL}/fics/${ficId}/elite-vault`, { method: 'DELETE' })
      setFics(prev => prev.filter(f => f.id !== ficId))
      toast.success('Removed from Elite Vault')
    } catch (err) {
      toast.error('Failed to remove')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-bg">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="animate-pulse text-vault-muted">Loading...</div>
        </div>
      </div>
    )
  }

  // PIN Setup Screen
  if (settingPin) {
    return (
      <div className="min-h-screen bg-vault-bg">
        <Header />
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 mb-2">
              Elite Vault
            </h1>
            <p className="text-vault-muted">
              Set a PIN to protect your most treasured fics
            </p>
          </div>

          <div className="vault-card space-y-4 border-amber-500/30">
            <div>
              <label className="block text-sm text-vault-muted mb-1">Create PIN</label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Enter PIN (4+ characters)"
                className="vault-input text-center text-xl tracking-[0.3em]"
                maxLength={12}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-vault-muted mb-1">Confirm PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm PIN"
                className="vault-input text-center text-xl tracking-[0.3em]"
                maxLength={12}
                onKeyDown={(e) => e.key === 'Enter' && handleSetPin()}
              />
            </div>
            <button
              onClick={handleSetPin}
              className="w-full py-3 rounded-xl font-semibold text-black
                         bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600
                         hover:from-yellow-300 hover:via-amber-400 hover:to-yellow-500
                         transition-all shadow-lg shadow-amber-500/20"
            >
              Set PIN & Enter
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Lock Screen
  if (locked) {
    return (
      <div className="min-h-screen bg-vault-bg">
        <Header />
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 mb-2">
              Elite Vault
            </h1>
            <p className="text-vault-muted">
              Enter your PIN to access your most treasured fics
            </p>
          </div>

          <div className="vault-card space-y-4 border-amber-500/30">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="vault-input text-center text-2xl tracking-[0.3em]"
              maxLength={12}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            />
            <button
              onClick={handleUnlock}
              className="w-full py-3 rounded-xl font-semibold text-black
                         bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600
                         hover:from-yellow-300 hover:via-amber-400 hover:to-yellow-500
                         transition-all shadow-lg shadow-amber-500/20"
            >
              Unlock
            </button>
            <Link to="/" className="block text-center text-sm text-vault-muted hover:text-vault-text transition-colors">
              Back to Library
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Unlocked Elite Vault
  return (
    <div className="min-h-screen bg-vault-bg">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-vault-muted hover:text-vault-text transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Library
          </Link>
          <button
            onClick={() => {
              sessionStorage.removeItem('elite_unlocked')
              setLocked(true)
              setPin('')
              toast('Elite Vault locked', { icon: '🔒' })
            }}
            className="text-sm text-vault-muted hover:text-amber-400 transition-colors"
          >
            🔒 Lock Vault
          </button>
        </div>

        {/* Title Section */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 mb-2">
            Elite Vault
          </h1>
          <p className="text-vault-muted">
            Your most treasured, re-read, unforgettable fics
          </p>
        </div>

        {/* Fics Grid */}
        {fics.length === 0 ? (
          <div className="vault-card text-center py-16 border-amber-500/20">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-xl font-semibold mb-2">Your Elite Vault Awaits</h3>
            <p className="text-vault-muted mb-6 max-w-md mx-auto">
              The Elite Vault is for fics you've read 5+ times — the ones you keep coming back to.
              You can also force-add any fic you feel belongs here.
            </p>
            <Link to="/" className="vault-btn-primary inline-flex items-center gap-2">
              <ArrowLeftIcon className="w-4 h-4" />
              Browse Your Library
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {fics.map(fic => (
              <div key={fic.id} className="relative">
                {/* Gold glow border */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400/30 via-amber-500/30 to-yellow-600/30 rounded-2xl blur-sm" />
                <div className="relative">
                  <FicCard
                    fic={fic}
                    onDelete={() => handleRemoveFromElite(fic.id)}
                    onToggleFavorite={() => {}}
                    onShipClick={() => {}}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {fics.length > 0 && (
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-6 text-sm text-vault-muted">
              <span>🏆 {fics.length} elite {fics.length === 1 ? 'fic' : 'fics'}</span>
              <span>📖 {fics.reduce((sum, f) => sum + (f.word_count || 0), 0).toLocaleString()} total words</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

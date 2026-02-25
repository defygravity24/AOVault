import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthModal from './components/AuthModal'
import Library from './pages/Library'
import FicDetail from './pages/FicDetail'
import Reader from './pages/Reader'
import EliteVault from './pages/EliteVault'
import Monitor from './pages/Monitor'
import './App.css'

function AppContent() {
  const { user, loading } = useAuth()

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-vault-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-vault-muted text-sm">Loading your vault...</p>
        </div>
      </div>
    )
  }

  // Not logged in — show login screen, BUT allow /read/ routes through
  // so offline cached fics are always readable
  if (!user) {
    // Check if we're on a reader or monitor URL — let them through without auth
    const isPublicPath = window.location.pathname.startsWith('/read/') || window.location.pathname === '/monitor'
    if (!isPublicPath) {
      return (
        <div className="min-h-screen bg-vault-bg flex flex-col items-center justify-center p-4">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">📚</div>
            <h1 className="text-3xl font-bold text-vault-text mb-1">AO Vault</h1>
            <p className="text-vault-muted">Your fic. Forever.</p>
          </div>

          {/* Auth modal rendered inline (not as overlay) */}
          <AuthModal isOpen={true} onClose={null} />
        </div>
      )
    }
  }

  // Logged in (or reader route) — show the app
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e1e1e',
            color: '#e0e0e0',
            border: '1px solid #2d2d2d',
            borderRadius: '12px',
            fontSize: '14px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#7d9c7a',
              secondary: '#1e1e1e',
            },
          },
          error: {
            iconTheme: {
              primary: '#c97d7d',
              secondary: '#1e1e1e',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/fic/:id" element={<FicDetail />} />
        <Route path="/read/:id" element={<Reader />} />
        <Route path="/elite-vault" element={<EliteVault />} />
        <Route path="/monitor" element={<Monitor />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e1e1e',
            color: '#e0e0e0',
            border: '1px solid #2d2d2d',
            borderRadius: '12px',
            fontSize: '14px',
            padding: '12px 16px',
          },
        }}
      />
      <AppContent />
    </AuthProvider>
  )
}

export default App

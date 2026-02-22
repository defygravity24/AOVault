import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from './AuthModal'
import { VaultIcon, SearchIcon, DownloadIcon, CloseIcon, UserIcon, LogOutIcon } from './Icons'

export default function Header({ searchQuery, setSearchQuery, onImportClick, onMenuClick }) {
  const { user, isGuest, logout } = useAuth()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  return (
    <>
      <header className="border-b border-vault-border bg-vault-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity shrink-0">
              <div className="text-accent-gold">
                <VaultIcon />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gradient">AOVault</h1>
                <p className="text-[10px] sm:text-xs text-vault-muted hidden sm:block">Your fic. Forever.</p>
              </div>
            </Link>

            {/* Desktop Search */}
            {setSearchQuery && (
              <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
                <div className="relative w-full">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted">
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    value={searchQuery || ''}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your vault..."
                    className="vault-input pl-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-muted hover:text-vault-text"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* User Button */}
              {isGuest ? (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="p-2 rounded-lg hover:bg-vault-bg text-vault-muted hover:text-vault-text transition-colors"
                  title="Sign in"
                >
                  <UserIcon />
                </button>
              ) : (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-8 h-8 rounded-full bg-accent-gold/20 text-accent-gold
                               flex items-center justify-center text-sm font-bold
                               hover:bg-accent-gold/30 transition-colors"
                    title={user.name || user.email}
                  >
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </button>

                  {/* User Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-vault-card border border-vault-border rounded-xl shadow-vault-lg py-2 z-50">
                      <div className="px-4 py-2 border-b border-vault-border">
                        <p className="text-sm font-medium text-vault-text truncate">{user.name}</p>
                        <p className="text-xs text-vault-muted truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          logout()
                          setShowUserMenu(false)
                          window.location.reload()
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-vault-muted hover:text-red-400 hover:bg-vault-bg transition-colors"
                      >
                        <LogOutIcon />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Elite Vault Link */}
              <Link
                to="/elite-vault"
                className="p-2 rounded-lg hover:bg-amber-500/10 text-vault-muted hover:text-amber-400 transition-colors"
                title="Elite Vault"
              >
                <span className="text-lg">🏆</span>
              </Link>

              {/* Mobile Search Toggle */}
              {setSearchQuery && (
                <button
                  onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-vault-bg text-vault-muted hover:text-vault-text transition-colors"
                  title="Search"
                >
                  {mobileSearchOpen ? <CloseIcon className="w-5 h-5" /> : <SearchIcon />}
                </button>
              )}

              {onImportClick && (
                <button
                  onClick={onImportClick}
                  className="vault-btn-primary flex items-center gap-2 text-sm sm:text-base"
                >
                  <DownloadIcon />
                  <span className="hidden sm:inline">Save Fic</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Search Bar (slides down) */}
          {mobileSearchOpen && setSearchQuery && (
            <div className="md:hidden mt-3 pb-1">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  value={searchQuery || ''}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search fics, ships, authors..."
                  className="vault-input pl-10"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-muted hover:text-vault-text"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}

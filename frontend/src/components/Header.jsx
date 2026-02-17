import { useState } from 'react'
import { Link } from 'react-router-dom'
import { VaultIcon, SearchIcon, DownloadIcon, CloseIcon } from './Icons'

export default function Header({ searchQuery, setSearchQuery, onImportClick }) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  return (
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
  )
}

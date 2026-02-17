import { Link } from 'react-router-dom'
import { VaultIcon, SearchIcon, DownloadIcon } from './Icons'

export default function Header({ searchQuery, setSearchQuery, onImportClick }) {
  return (
    <header className="border-b border-vault-border bg-vault-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="text-lj-blue-500">
              <VaultIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">AOVault</h1>
              <p className="text-xs text-vault-muted">Your fic. Forever.</p>
            </div>
          </Link>

          {/* Search */}
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
              </div>
            </div>
          )}

          {/* Actions */}
          {onImportClick && (
            <div className="flex items-center gap-3">
              <button
                onClick={onImportClick}
                className="vault-btn-primary flex items-center gap-2"
              >
                <DownloadIcon />
                <span className="hidden sm:inline">Save Fic</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

import { useState, useEffect } from 'react'
import Header from '../components/Header'
import FicCard from '../components/FicCard'
import ImportModal from '../components/ImportModal'
import { BookIcon, HeartIcon, VaultIcon, FilterIcon, SortIcon } from '../components/Icons'
import { API_URL } from '../config'

// Format word count nicely
const formatWordCount = (count) => {
  if (!count) return '0'
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}k`
  }
  return count.toString()
}

export default function Library() {
  const [fics, setFics] = useState([])
  const [stats, setStats] = useState({ totalFics: 0, favorites: 0, totalWords: 0 })
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date_added')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch fics on mount
  useEffect(() => {
    fetchFics()
    fetchStats()
  }, [])

  const fetchFics = async () => {
    try {
      const response = await fetch(`${API_URL}/fics`)
      const data = await response.json()
      setFics(data.fics || [])
    } catch (err) {
      console.error('Failed to fetch fics:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`)
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const handleImportSuccess = (newFic) => {
    setFics(prev => [newFic, ...prev])
    fetchStats()
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this fic from your vault?')) return

    try {
      await fetch(`${API_URL}/fics/${id}`, { method: 'DELETE' })
      setFics(prev => prev.filter(f => f.id !== id))
      fetchStats()
    } catch (err) {
      console.error('Failed to delete fic:', err)
    }
  }

  const handleToggleFavorite = async (id, favorite) => {
    try {
      await fetch(`${API_URL}/fics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite }),
      })
      setFics(prev => prev.map(f => f.id === id ? { ...f, favorite: favorite ? 1 : 0 } : f))
      fetchStats()
    } catch (err) {
      console.error('Failed to update favorite:', err)
    }
  }

  // Filter and sort fics
  const filteredFics = fics
    .filter(fic => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesSearch = (
          fic.title?.toLowerCase().includes(q) ||
          fic.author?.toLowerCase().includes(q) ||
          fic.fandom?.toLowerCase().includes(q) ||
          fic.ship?.toLowerCase().includes(q) ||
          fic.tags?.toLowerCase().includes(q)
        )
        if (!matchesSearch) return false
      }
      // Status filter
      if (filterStatus && fic.status !== filterStatus) return false
      // Rating filter
      if (filterRating && !fic.rating?.startsWith(filterRating)) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '')
        case 'author':
          return (a.author || '').localeCompare(b.author || '')
        case 'word_count':
          return (b.word_count || 0) - (a.word_count || 0)
        case 'date_added':
        default:
          return new Date(b.date_added) - new Date(a.date_added)
      }
    })

  return (
    <div className="min-h-screen bg-vault-bg">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onImportClick={() => setShowImport(true)}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Bar */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2 text-vault-muted">
            <BookIcon />
            <span><strong className="text-vault-text">{stats.totalFics}</strong> fics</span>
          </div>
          <div className="flex items-center gap-2 text-vault-muted">
            <HeartIcon filled={false} />
            <span><strong className="text-vault-text">{stats.favorites}</strong> favorites</span>
          </div>
          <div className="flex items-center gap-2 text-vault-muted">
            <span><strong className="text-vault-text">{formatWordCount(stats.totalWords)}</strong> words</span>
          </div>

          <div className="flex-1" />

          {/* Sort & Filter Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`vault-btn-secondary flex items-center gap-2 text-sm ${showFilters ? 'border-lj-blue-500' : ''}`}
            >
              <FilterIcon className="w-4 h-4" />
              Filters
            </button>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="vault-input text-sm pl-8 pr-4 py-1.5 appearance-none cursor-pointer"
              >
                <option value="date_added">Recently Added</option>
                <option value="title">Title A-Z</option>
                <option value="author">Author A-Z</option>
                <option value="word_count">Word Count</option>
              </select>
              <SortIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-muted pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-vault-card border border-vault-border rounded-lg">
            <span className="text-sm text-vault-muted">Filter by:</span>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="vault-input text-sm py-1.5 w-auto"
            >
              <option value="">All Status</option>
              <option value="Complete">Complete</option>
              <option value="WIP">WIP</option>
            </select>

            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="vault-input text-sm py-1.5 w-auto"
            >
              <option value="">All Ratings</option>
              <option value="G">G - General</option>
              <option value="T">T - Teen</option>
              <option value="M">M - Mature</option>
              <option value="E">E - Explicit</option>
            </select>

            {(filterStatus || filterRating) && (
              <button
                onClick={() => { setFilterStatus(''); setFilterRating('') }}
                className="text-sm text-lj-blue-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="animate-pulse text-vault-muted">Loading your vault...</div>
          </div>
        )}

        {/* Fic Grid */}
        {!loading && filteredFics.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFics.map(fic => (
              <FicCard
                key={fic.id}
                fic={fic}
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredFics.length === 0 && (
          <div className="text-center py-16">
            <div className="text-vault-muted mb-4">
              <VaultIcon className="w-16 h-16 mx-auto opacity-50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {searchQuery || filterStatus || filterRating ? 'No fics found' : 'Your vault is empty'}
            </h2>
            <p className="text-vault-muted mb-6">
              {searchQuery || filterStatus || filterRating
                ? 'Try adjusting your search or filters.'
                : 'Start saving fics from AO3 to build your personal library.'}
            </p>
            {!searchQuery && !filterStatus && !filterRating && (
              <button onClick={() => setShowImport(true)} className="vault-btn-primary">
                Save Your First Fic
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-vault-border mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-vault-muted text-sm">
          <p className="mb-2">
            Built by fans, for fans. AOVault is free and always will be.
          </p>
          <p>
            <a href="#" className="text-lj-blue-400 hover:underline">Support AOVault</a>
            {' '}&middot;{' '}
            <a href="#" className="text-lj-blue-400 hover:underline">About</a>
            {' '}&middot;{' '}
            <a href="#" className="text-lj-blue-400 hover:underline">Privacy</a>
          </p>
        </div>
      </footer>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  )
}

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import FicCard from '../components/FicCard'
import FicCardSkeleton from '../components/FicCardSkeleton'
import ImportModal from '../components/ImportModal'
import Sidebar from '../components/Sidebar'
import ShipPill from '../components/ShipPill'
import { BookIcon, HeartIcon, VaultIcon, FilterIcon, SortIcon, MenuIcon, LinkIcon } from '../components/Icons'
import { API_URL, apiFetch } from '../config'
import { cacheFicMeta, getCachedFicMeta } from '../utils/offlineCache'

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
  const navigate = useNavigate()
  const [fics, setFics] = useState([])
  const [stats, setStats] = useState({ totalFics: 0, favorites: 0, totalWords: 0 })
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date_added')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [filterShip, setFilterShip] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Quick-paste URL bar
  const [pasteUrl, setPasteUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const pasteInputRef = useRef(null)

  // Collections state
  const [collections, setCollections] = useState([])
  const [activeCollectionId, setActiveCollectionId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Quick import from URL (used by paste bar and deep links)
  const quickImport = useCallback(async (url) => {
    if (!url || !url.includes('archiveofourown.org/works/')) {
      toast.error('Paste a valid AO3 URL')
      return
    }
    setImporting(true)
    const loadingToast = toast.loading('Saving from AO3...')
    try {
      // First try: let server fetch from AO3
      let response = await apiFetch(`${API_URL}/fics/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      let data = await response.json()

      // If server can't reach AO3 (Cloudflare block), use CF Worker proxy from browser
      if (response.status === 422 && data.needsClientFetch) {
        toast.dismiss(loadingToast)
        const relayToast = toast.loading('Fetching from AO3 via proxy...')
        try {
          const workerUrl = 'https://ao3-proxy.defy-gravity-24-sda.workers.dev'
          const ao3Response = await fetch(`${workerUrl}/?url=${encodeURIComponent(url)}`)
          if (!ao3Response.ok) throw new Error(`Proxy returned ${ao3Response.status}`)
          const html = await ao3Response.text()
          response = await apiFetch(`${API_URL}/fics/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, html }),
          })
          data = await response.json()
          toast.dismiss(relayToast)
        } catch (relayErr) {
          toast.dismiss(relayToast)
          throw new Error('Could not reach AO3. Please try again in a minute.')
        }
      }

      if (response.status === 409 && data.alreadySaved) {
        toast.dismiss(loadingToast)
        toast(`"${data.title}" is already in your vault!`, { icon: '📚' })
        setPasteUrl('')
        return
      }
      if (!response.ok) throw new Error(data.error || 'Import failed')
      toast.dismiss(loadingToast)
      toast.success(`"${data.fic.title}" saved to vault!`)
      setFics(prev => [data.fic, ...prev])
      fetchStats()
      fetchCollections()
      setPasteUrl('')
    } catch (err) {
      toast.dismiss(loadingToast)
      toast.error(err.message || 'Failed to import')
    } finally {
      setImporting(false)
    }
  }, [])

  // Handle deep links from iOS (aovault://import?url=...)
  useEffect(() => {
    let cleanup
    const setupDeepLinks = async () => {
      try {
        const { App } = await import('@capacitor/app')
        const listener = await App.addListener('appUrlOpen', (event) => {
          const url = event.url
          if (url) {
            if (url.startsWith('aovault://import')) {
              const params = new URL(url)
              const ao3Url = params.searchParams.get('url')
              if (ao3Url) quickImport(ao3Url)
            } else if (url.includes('archiveofourown.org')) {
              const ao3Url = url.replace('aovault://', 'https://')
              quickImport(ao3Url)
            }
          }
        })
        cleanup = () => listener.remove()
      } catch {
        // Not running in Capacitor — skip
      }
    }
    setupDeepLinks()
    return () => cleanup?.()
  }, [quickImport])

  // Handle URLs from iOS Share Extension (via AppDelegate bridge)
  useEffect(() => {
    // Register the global callback for native → JS communication
    window.__aovaultShareImport = (url) => {
      quickImport(url)
    }
    // Process any URLs that arrived before this component mounted
    if (window.__aovaultPendingImports?.length) {
      window.__aovaultPendingImports.forEach(url => quickImport(url))
      window.__aovaultPendingImports = []
    }
    return () => { delete window.__aovaultShareImport }
  }, [quickImport])

  // Fetch fics and collections on mount
  useEffect(() => {
    fetchCollections()
    fetchFics()
    fetchStats()
  }, [])

  const fetchFics = async () => {
    try {
      const response = await apiFetch(`${API_URL}/fics`)
      const data = await response.json()
      const ficList = data.fics || []
      setFics(ficList)
      cacheFicMeta(ficList) // Save to localStorage for offline access
    } catch (err) {
      console.error('Failed to fetch fics:', err)
      // Offline fallback — load cached fic list
      const cached = getCachedFicMeta()
      if (cached) {
        setFics(cached)
        toast('Offline mode — showing cached library', { icon: '📶' })
      } else {
        toast.error('Failed to load your vault')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchCollections = async () => {
    try {
      const response = await apiFetch(`${API_URL}/collections`)
      const data = await response.json()
      setCollections(data.collections || [])
      // Default to "All Fics" collection
      if (!activeCollectionId && data.collections?.length > 0) {
        const allFics = data.collections.find(c => c.is_smart && c.name === 'All Fics')
        if (allFics) setActiveCollectionId(allFics.id)
      }
    } catch (err) {
      console.error('Failed to fetch collections:', err)
      // Non-critical — app still works without collections
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiFetch(`${API_URL}/stats`)
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const handleImportSuccess = (newFic) => {
    setFics(prev => [newFic, ...prev])
    fetchStats()
    fetchCollections()
    toast.success(`"${newFic.title}" saved to vault!`)
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this fic from your vault?')) return

    const fic = fics.find(f => f.id === id)
    try {
      await apiFetch(`${API_URL}/fics/${id}`, { method: 'DELETE' })
      setFics(prev => prev.filter(f => f.id !== id))
      fetchStats()
      fetchCollections()
      toast.success(`"${fic?.title}" removed`)
    } catch (err) {
      console.error('Failed to delete fic:', err)
      toast.error('Failed to remove fic')
    }
  }

  const handleToggleFavorite = async (id, favorite) => {
    try {
      await apiFetch(`${API_URL}/fics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite }),
      })
      setFics(prev => prev.map(f => f.id === id ? { ...f, favorite: favorite ? 1 : 0 } : f))
      fetchStats()
      fetchCollections()
      toast(favorite ? '❤️ Added to favorites' : 'Removed from favorites', { duration: 2000 })
    } catch (err) {
      console.error('Failed to update favorite:', err)
      toast.error('Failed to update favorite')
    }
  }

  const handleShipClick = (ship) => {
    setFilterShip(prev => prev === ship ? '' : ship)
  }

  const handleSelectCollection = (collectionId) => {
    setActiveCollectionId(collectionId)
    setFilterShip('')
    setFilterStatus('')
    setFilterRating('')
    setSearchQuery('')
  }

  const handleCreateCollection = async ({ name, icon }) => {
    try {
      const response = await apiFetch(`${API_URL}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setCollections(prev => [...prev, { ...data.collection, fic_count: 0 }])
      toast.success(`Collection "${name}" created!`)
    } catch (err) {
      console.error('Failed to create collection:', err)
      toast.error(err.message || 'Failed to create collection')
    }
  }

  // Get the active collection info
  const activeCollection = collections.find(c => c.id === activeCollectionId)

  // Extract unique ships from all fics for the filter chips
  const allShips = useMemo(() => {
    const shipCounts = {}
    fics.forEach(fic => {
      if (fic.ship) {
        fic.ship.split(',').map(s => s.trim()).filter(s => s).forEach(ship => {
          shipCounts[ship] = (shipCounts[ship] || 0) + 1
        })
      }
    })
    return Object.entries(shipCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([ship, count]) => ({ ship, count }))
  }, [fics])

  // Filter fics based on active collection + search/filters
  const filteredFics = useMemo(() => {
    let result = [...fics]

    // Apply smart collection filter
    if (activeCollection?.is_smart) {
      const rules = JSON.parse(activeCollection.smart_rules || '{}')
      switch (rules.type) {
        case 'favorites':
          result = result.filter(f => f.favorite)
          break
        case 'reading':
          result = result.filter(f => f.read_status === 'reading')
          break
        case 'wip':
          result = result.filter(f => f.status === 'WIP')
          break
        case 'complete':
          result = result.filter(f => f.status === 'Complete')
          break
      }
    }

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(fic =>
        fic.title?.toLowerCase().includes(q) ||
        fic.author?.toLowerCase().includes(q) ||
        fic.fandom?.toLowerCase().includes(q) ||
        fic.ship?.toLowerCase().includes(q) ||
        fic.tags?.toLowerCase().includes(q)
      )
    }

    // Apply additional filters
    if (filterStatus) result = result.filter(f => f.status === filterStatus)
    if (filterRating) result = result.filter(f => f.rating?.startsWith(filterRating))
    if (filterShip) result = result.filter(f => f.ship?.includes(filterShip))

    // Sort
    result.sort((a, b) => {
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

    return result
  }, [fics, activeCollection, searchQuery, filterStatus, filterRating, filterShip, sortBy])

  const hasActiveFilters = filterStatus || filterRating || filterShip

  return (
    <div className="min-h-screen bg-vault-bg">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onImportClick={() => setShowImport(true)}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          collections={collections}
          activeCollectionId={activeCollectionId}
          onSelectCollection={handleSelectCollection}
          onCreateCollection={handleCreateCollection}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0 max-w-6xl mx-auto px-4 py-6 sm:py-8">
          {/* Collection Title */}
          {activeCollection && activeCollection.name !== 'All Fics' && (
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{activeCollection.icon}</span>
              <h2 className="text-xl font-semibold text-vault-text">{activeCollection.name}</h2>
              <span className="text-sm text-vault-muted">({filteredFics.length})</span>
            </div>
          )}

          {/* Quick-Paste URL Bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); quickImport(pasteUrl) }}
            className="flex items-center gap-2 mb-4"
          >
            <div className="flex-1 relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-muted pointer-events-none" />
              <input
                ref={pasteInputRef}
                type="url"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                placeholder="Paste AO3 link to save..."
                className="vault-input text-sm w-full pl-9 pr-4 py-2.5"
                disabled={importing}
              />
            </div>
            <button
              type="submit"
              disabled={importing || !pasteUrl}
              className="vault-btn-primary text-sm px-4 py-2.5 whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </form>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-4 text-sm">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-vault-bg text-vault-muted hover:text-vault-text transition-colors"
              title="Collections"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

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
                className={`vault-btn-secondary flex items-center gap-2 text-sm ${hasActiveFilters ? 'border-accent-gold/50 text-accent-gold' : ''}`}
              >
                <FilterIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-accent-gold" />
                )}
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

          {/* Ship Quick-Filter Chips */}
          {allShips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {allShips.slice(0, 8).map(({ ship, count }) => (
                <ShipPill
                  key={ship}
                  ship={`${ship} (${count})`}
                  size="sm"
                  active={filterShip === ship}
                  onClick={() => handleShipClick(ship)}
                />
              ))}
              {filterShip && (
                <button
                  onClick={() => setFilterShip('')}
                  className="text-xs text-vault-muted hover:text-vault-text px-2 py-1"
                >
                  Clear ship filter
                </button>
              )}
            </div>
          )}

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

              {hasActiveFilters && (
                <button
                  onClick={() => { setFilterStatus(''); setFilterRating(''); setFilterShip('') }}
                  className="text-sm text-accent-gold hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Loading State — Skeleton Grid */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <FicCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Fic Grid */}
          {!loading && filteredFics.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFics.map(fic => (
                <FicCard
                  key={fic.id}
                  fic={fic}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                  onShipClick={handleShipClick}
                  collections={collections.filter(c => !c.is_smart)}
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
                {searchQuery || hasActiveFilters
                  ? 'No fics found'
                  : activeCollection && activeCollection.name !== 'All Fics'
                    ? `No fics in ${activeCollection.name}`
                    : 'Your vault is empty'}
              </h2>
              <p className="text-vault-muted mb-6">
                {searchQuery || hasActiveFilters
                  ? 'Try adjusting your search or filters.'
                  : activeCollection && activeCollection.name !== 'All Fics'
                    ? activeCollection.is_smart
                      ? 'Fics that match this collection will appear here automatically.'
                      : 'Add fics to this collection from your library.'
                    : 'Start saving fics from AO3 to build your personal library.'}
              </p>
              {!searchQuery && !hasActiveFilters && (!activeCollection || activeCollection.name === 'All Fics') && (
                <button onClick={() => setShowImport(true)} className="vault-btn-primary">
                  Save Your First Fic
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-vault-border mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-vault-muted text-sm">
          <p className="mb-2">
            Built by fans, for fans. AOVault is free and always will be.
          </p>
          <p>
            <a href="#" className="text-accent-gold hover:underline">Support AOVault</a>
            {' '}&middot;{' '}
            <a href="#" className="text-accent-gold hover:underline">About</a>
            {' '}&middot;{' '}
            <a href="#" className="text-accent-gold hover:underline">Privacy</a>
          </p>
        </div>
      </footer>

      {/* Floating Add Fic Button (mobile-friendly FAB) */}
      <button
        onClick={() => setShowImport(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full
                   bg-accent-gold text-vault-bg shadow-lg shadow-accent-gold/30
                   flex items-center justify-center text-3xl font-light
                   hover:scale-110 active:scale-95 transition-transform"
        title="Save a fic"
      >
        +
      </button>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  )
}

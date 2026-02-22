import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { HeartIcon, ExternalLinkIcon, TrashIcon, BookOpenIcon, FolderPlusIcon, CheckIcon, DownloadIcon } from './Icons'
import ShipPill from './ShipPill'
import { ReactionsCompact } from './ReactionsDisplay'
import { API_URL, apiFetch } from '../config'
import { isCached, cacheFicContent } from '../utils/offlineCache'

// Format word count nicely
const formatWordCount = (count) => {
  if (!count) return '0'
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}k`
  }
  return count.toString()
}

// Rating badge color
const getRatingColor = (rating) => {
  if (!rating) return 'text-vault-muted'
  const r = rating.charAt(0).toUpperCase()
  switch (r) {
    case 'G': return 'text-accent-sage'
    case 'T': return 'text-yellow-400'
    case 'M': return 'text-orange-400'
    case 'E': return 'text-red-400'
    default: return 'text-vault-muted'
  }
}

// Parse tags from comma-separated string
const parseTags = (tagString) => {
  if (!tagString) return []
  return tagString.split(',').map(t => t.trim()).filter(t => t)
}

// Parse ships from comma-separated string
const parseShips = (shipString) => {
  if (!shipString) return []
  return shipString.split(',').map(s => s.trim()).filter(s => s)
}

export default function FicCard({ fic, onDelete, onToggleFavorite, onShipClick, collections = [] }) {
  const navigate = useNavigate()
  const [showCollectionMenu, setShowCollectionMenu] = useState(false)
  const [showAllTags, setShowAllTags] = useState(false)
  const [addingTo, setAddingTo] = useState(null)
  const [reactions, setReactions] = useState([])
  const [cachedOffline, setCachedOffline] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const menuRef = useRef(null)
  const tags = parseTags(fic.tags)

  // Check if fic is cached for offline reading
  useEffect(() => {
    isCached(fic.id).then(setCachedOffline)
  }, [fic.id])

  // Fetch reactions for this fic
  useEffect(() => {
    const fetchReactions = async () => {
      try {
        const response = await apiFetch(`${API_URL}/fics/${fic.id}/reactions`)
        const data = await response.json()
        setReactions(data.reactions || [])
      } catch (err) {
        // Silently fail — reactions are supplementary
      }
    }
    fetchReactions()
  }, [fic.id])
  const ships = parseShips(fic.ship)
  const chapters = fic.chapter_total
    ? `${fic.chapter_count}/${fic.chapter_total}`
    : `${fic.chapter_count}/?`

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowCollectionMenu(false)
      }
    }
    if (showCollectionMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCollectionMenu])

  const handleAddToCollection = async (collectionId, collectionName) => {
    setAddingTo(collectionId)
    try {
      const response = await apiFetch(`${API_URL}/collections/${collectionId}/fics/${fic.id}`, {
        method: 'POST',
      })
      const data = await response.json()
      if (response.status === 409) {
        toast('Already in this collection', { icon: '📌', duration: 2000 })
      } else if (!response.ok) {
        throw new Error(data.error)
      } else {
        toast.success(`Added to "${collectionName}"`)
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add to collection')
    } finally {
      setAddingTo(null)
      setShowCollectionMenu(false)
    }
  }

  const handleDownload = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDownloading(true)
    const loadingToast = toast.loading('Fetching from AO3...')
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)
      const response = await apiFetch(`${API_URL}/fics/${fic.id}/content`, { signal: controller.signal })
      clearTimeout(timeout)
      if (!response.ok) throw new Error(`Server error: ${response.status}`)
      const data = await response.json()
      await cacheFicContent(fic.id, data)
      setCachedOffline(true)
      toast.dismiss(loadingToast)
      toast.success(`Saved! ${data.chapters?.length || 0} chapters`)
    } catch (err) {
      toast.dismiss(loadingToast)
      if (err.name === 'AbortError') toast.error('Timed out — try again')
      else if (err.message === 'Load failed' || err.message === 'Failed to fetch') toast.error('Can\'t reach server')
      else toast.error(err.message || 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="vault-card group">
      {/* Header: Title + Rating */}
      <div className="flex items-start justify-between mb-1">
        <Link
          to={`/fic/${fic.id}`}
          className="font-semibold text-lg text-vault-text group-hover:text-accent-gold transition-colors line-clamp-2 flex-1"
        >
          {fic.title}
        </Link>
        <span className={`font-mono text-sm font-bold ml-2 shrink-0 ${getRatingColor(fic.rating)}`}>
          {fic.rating?.charAt(0) || '?'}
        </span>
      </div>

      {/* Author */}
      <p className="text-vault-muted text-sm mb-3">
        by{' '}
        {fic.author_url ? (
          <a href={fic.author_url} target="_blank" rel="noopener noreferrer"
             className="text-accent-gold hover:underline">
            {fic.author}
          </a>
        ) : (
          <span className="text-accent-gold">{fic.author}</span>
        )}
      </p>

      {/* Main Ship — one big pill */}
      {ships.length > 0 && (
        <div className="mb-3">
          <ShipPill
            ship={ships[0]}
            size="md"
            onClick={onShipClick}
          />
        </div>
      )}

      {/* Fandom */}
      {fic.fandom && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {parseTags(fic.fandom).slice(0, 2).map((f, i) => (
            <span key={i} className="vault-tag">{f}</span>
          ))}
        </div>
      )}

      {/* Summary */}
      <p className="text-vault-muted text-sm line-clamp-3 mb-3">
        {fic.summary || 'No summary available.'}
      </p>

      {/* Show additional AO3 tags toggle */}
      {(tags.length > 0 || ships.length > 1) && (
        <div className="mb-3">
          {!showAllTags ? (
            <button
              onClick={() => setShowAllTags(true)}
              className="text-xs text-accent-gold hover:underline"
            >
              Show additional tags from AO3 →
            </button>
          ) : (
            <div className="space-y-2">
              {/* Additional ships */}
              {ships.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {ships.slice(1).map((ship, i) => (
                    <ShipPill key={i} ship={ship} size="sm" onClick={onShipClick} />
                  ))}
                </div>
              )}
              {/* AO3 tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag, i) => (
                    <span key={i} className="text-xs text-vault-muted bg-vault-bg px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowAllTags(false)}
                className="text-xs text-vault-muted hover:text-vault-text"
              >
                Hide tags
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reactions Preview */}
      {reactions.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <ReactionsCompact reactions={reactions} />
        </div>
      )}

      {/* Footer: Stats + Read/Save Offline */}
      <div className="flex items-center justify-between text-xs text-vault-muted border-t border-vault-border pt-3">
        <div className="flex items-center gap-3">
          <span>{formatWordCount(fic.word_count)} words</span>
          <span>{chapters} ch</span>
          <span className={fic.status === 'Complete' ? 'text-accent-sage' : 'text-yellow-400'}>
            {fic.status}
          </span>
        </div>
        {cachedOffline ? (
          <Link
            to={`/read/${fic.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-sage/15 text-accent-sage text-xs font-medium border border-accent-sage/30"
          >
            <BookOpenIcon className="w-3.5 h-3.5" />
            Read Offline
          </Link>
        ) : (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vault-bg text-vault-muted hover:text-accent-sage text-xs font-medium border border-vault-border hover:border-accent-sage/30 transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-vault-muted/30 border-t-accent-sage rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <DownloadIcon className="w-3.5 h-3.5" />
                Save Offline
              </>
            )}
          </button>
        )}
      </div>

      {/* Actions (shown on hover, always visible on mobile) */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-vault-border
                      opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleFavorite(fic.id, !fic.favorite)}
            className={`p-1.5 rounded hover:bg-vault-bg transition-colors ${fic.favorite ? 'text-red-400' : 'text-vault-muted'}`}
            title={fic.favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <HeartIcon filled={fic.favorite} />
          </button>
          <Link
            to={`/read/${fic.id}`}
            className="p-1.5 rounded hover:bg-vault-bg text-vault-muted hover:text-accent-sage transition-colors"
            title="Read in app"
          >
            <BookOpenIcon />
          </Link>
          <a
            href={fic.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-vault-bg text-vault-muted hover:text-accent-gold transition-colors"
            title="View on AO3"
          >
            <ExternalLinkIcon />
          </a>

          {/* Offline indicator */}
          {cachedOffline ? (
            <Link
              to={`/read/${fic.id}`}
              className="p-1.5 rounded text-accent-sage hover:bg-vault-bg transition-colors"
              title="Read offline"
            >
              <CheckIcon />
            </Link>
          ) : (
            <Link
              to={`/fic/${fic.id}`}
              className="p-1.5 rounded hover:bg-vault-bg text-vault-muted hover:text-accent-sage transition-colors"
              title="Save for offline"
            >
              <DownloadIcon className="w-4 h-4" />
            </Link>
          )}

          {/* Add to Collection */}
          {collections.length > 0 && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowCollectionMenu(!showCollectionMenu)}
                className="p-1.5 rounded hover:bg-vault-bg text-vault-muted hover:text-accent-sage transition-colors"
                title="Add to collection"
              >
                <FolderPlusIcon />
              </button>

              {showCollectionMenu && (
                <div className="absolute bottom-full left-0 mb-1 w-48 bg-vault-card border border-vault-border rounded-lg shadow-vault-lg py-1 z-30">
                  <p className="px-3 py-1.5 text-xs text-vault-muted font-semibold">Add to collection</p>
                  {collections.map(col => (
                    <button
                      key={col.id}
                      onClick={() => handleAddToCollection(col.id, col.name)}
                      disabled={addingTo === col.id}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-vault-text hover:bg-vault-bg transition-colors disabled:opacity-50"
                    >
                      <span>{col.icon}</span>
                      <span className="flex-1 text-left truncate">{col.name}</span>
                      {addingTo === col.id && (
                        <span className="w-3 h-3 border border-vault-muted border-t-accent-sage rounded-full animate-spin" />
                      )}
                    </button>
                  ))}
                  {collections.length === 0 && (
                    <p className="px-3 py-2 text-xs text-vault-muted">Create a collection first</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(fic.id)}
          className="p-1.5 rounded hover:bg-red-900/30 text-vault-muted hover:text-red-400 transition-colors"
          title="Remove from vault"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

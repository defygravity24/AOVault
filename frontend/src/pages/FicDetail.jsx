import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Header from '../components/Header'
import ShipPill from '../components/ShipPill'
import ReactionPicker from '../components/ReactionPicker'
import ReactionsDisplay from '../components/ReactionsDisplay'
import NotificationSettings from '../components/NotificationSettings'
import {
  ArrowLeftIcon, HeartIcon, ExternalLinkIcon, BookOpenIcon,
  EditIcon, TagIcon, TrashIcon, DownloadIcon
} from '../components/Icons'
import { API_URL, apiFetch } from '../config'
import { cacheFicContent, isCached, removeCachedContent } from '../utils/offlineCache'

// Format word count nicely
const formatWordCount = (count) => {
  if (!count) return '0'
  return count.toLocaleString()
}

// Rating badge color
const getRatingColor = (rating) => {
  if (!rating) return 'text-vault-muted'
  const r = rating.charAt(0).toUpperCase()
  switch (r) {
    case 'G': return 'text-lj-green-400 bg-lj-green-900/30'
    case 'T': return 'text-yellow-400 bg-yellow-900/30'
    case 'M': return 'text-orange-400 bg-orange-900/30'
    case 'E': return 'text-red-400 bg-red-900/30'
    default: return 'text-vault-muted bg-vault-bg'
  }
}

// Parse tags from comma-separated string
const parseTags = (tagString) => {
  if (!tagString) return []
  return tagString.split(',').map(t => t.trim()).filter(t => t)
}

export default function FicDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fic, setFic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [personalTags, setPersonalTags] = useState('')
  const [reactions, setReactions] = useState([])
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [cachedOffline, setCachedOffline] = useState(false)

  useEffect(() => {
    fetchFic()
    fetchReactions()
    isCached(parseInt(id)).then(setCachedOffline)
  }, [id])

  const fetchFic = async () => {
    try {
      const response = await apiFetch(`${API_URL}/fics/${id}`)
      const data = await response.json()
      if (data.fic) {
        setFic(data.fic)
        setNotes(data.fic.notes || '')
        setPersonalTags(data.fic.personal_tags || '')
      }
    } catch (err) {
      console.error('Failed to fetch fic:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchReactions = async () => {
    try {
      const response = await apiFetch(`${API_URL}/fics/${id}/reactions`)
      const data = await response.json()
      setReactions(data.reactions || [])
    } catch (err) {
      console.error('Failed to fetch reactions:', err)
    }
  }

  const handleReactionAdded = (newReaction) => {
    setReactions(prev => [newReaction, ...prev])
  }

  const handleReactionDeleted = (reactionId) => {
    setReactions(prev => prev.filter(r => r.id !== reactionId))
  }

  const handleToggleFavorite = async () => {
    try {
      const newFavorite = !fic.favorite
      await apiFetch(`${API_URL}/fics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: newFavorite }),
      })
      setFic(prev => ({ ...prev, favorite: newFavorite ? 1 : 0 }))
    } catch (err) {
      console.error('Failed to update favorite:', err)
    }
  }

  const handleSaveNotes = async () => {
    try {
      await apiFetch(`${API_URL}/fics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, personal_tags: personalTags }),
      })
      setFic(prev => ({ ...prev, notes, personal_tags: personalTags }))
      setEditingNotes(false)
    } catch (err) {
      console.error('Failed to save notes:', err)
    }
  }

  const handleToggleEliteVault = async () => {
    try {
      if (fic.in_elite_vault) {
        await apiFetch(`${API_URL}/fics/${id}/elite-vault`, { method: 'DELETE' })
        setFic(prev => ({ ...prev, in_elite_vault: 0 }))
        toast.success('Removed from Elite Vault')
      } else {
        const response = await apiFetch(`${API_URL}/fics/${id}/elite-vault`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true }),
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error)
        }
        setFic(prev => ({ ...prev, in_elite_vault: 1 }))
        toast.success('Added to Elite Vault! 🏆')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update Elite Vault')
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    const loadingToast = toast.loading('Fetching from AO3... this may take a moment')
    try {
      // Use AbortController with generous timeout for large fics
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000) // 2 min timeout

      const response = await apiFetch(`${API_URL}/fics/${id}/content`, {
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      const data = await response.json()
      await cacheFicContent(parseInt(id), data)
      setCachedOffline(true)
      toast.dismiss(loadingToast)
      toast.success(`Saved! ${data.chapters?.length || 0} chapter(s) cached`)
    } catch (err) {
      toast.dismiss(loadingToast)
      if (err.name === 'AbortError') {
        toast.error('Request timed out — try again on faster WiFi')
      } else if (err.message === 'Load failed' || err.message === 'Failed to fetch') {
        toast.error('Can\'t reach server — make sure Mac backend is running')
      } else {
        toast.error(err.message || 'Download failed')
      }
    } finally {
      setDownloading(false)
    }
  }

  const handleRemoveDownload = async () => {
    try {
      await removeCachedContent(parseInt(id))
      setCachedOffline(false)
      toast.success('Offline copy removed')
    } catch (err) {
      toast.error('Failed to remove download')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Remove this fic from your vault?')) return

    try {
      await apiFetch(`${API_URL}/fics/${id}`, { method: 'DELETE' })
      navigate('/')
    } catch (err) {
      console.error('Failed to delete fic:', err)
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

  if (!fic) {
    return (
      <div className="min-h-screen bg-vault-bg">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-xl font-semibold mb-4">Fic not found</h2>
          <Link to="/" className="vault-btn-primary">Back to Library</Link>
        </div>
      </div>
    )
  }

  const tags = parseTags(fic.tags)
  const characters = parseTags(fic.characters)
  const ships = parseTags(fic.ship)
  const fandoms = parseTags(fic.fandom)
  const warnings = parseTags(fic.warnings)
  const myTags = parseTags(personalTags)

  return (
    <div className="min-h-screen bg-vault-bg">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-vault-muted hover:text-vault-text mb-6 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Library
        </Link>

        {/* Fic Header */}
        <div className="vault-card mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-vault-text mb-2">
                {fic.title}
              </h1>
              <p className="text-vault-muted">
                by{' '}
                {fic.author_url ? (
                  <a href={fic.author_url} target="_blank" rel="noopener noreferrer"
                     className="text-lj-blue-400 hover:underline">
                    {fic.author}
                  </a>
                ) : (
                  <span className="text-lj-blue-400">{fic.author}</span>
                )}
              </p>
            </div>

            <span className={`px-3 py-1 rounded-full font-mono font-bold ${getRatingColor(fic.rating)}`}>
              {fic.rating || 'Not Rated'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-vault-border">
            <Link to={`/read/${fic.id}`} className="vault-btn-primary flex items-center gap-2">
              <BookOpenIcon />
              Read
            </Link>

            <button
              onClick={handleToggleFavorite}
              className={`vault-btn-secondary flex items-center gap-2 ${fic.favorite ? 'text-red-400 border-red-400/50' : ''}`}
            >
              <HeartIcon filled={fic.favorite} />
              {fic.favorite ? 'Favorited' : 'Favorite'}
            </button>

            <a
              href={fic.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="vault-btn-secondary flex items-center gap-2"
            >
              <ExternalLinkIcon />
              View on AO3
            </a>

            <button
              onClick={handleToggleEliteVault}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                fic.in_elite_vault
                  ? 'bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-yellow-600/20 text-amber-400 border border-amber-500/50'
                  : 'vault-btn-secondary hover:text-amber-400 hover:border-amber-400/50'
              }`}
            >
              <span>{fic.in_elite_vault ? '🏆' : '✨'}</span>
              {fic.in_elite_vault ? 'In Elite Vault' : 'Elite Vault'}
            </button>

            {/* Download / Read Offline Button */}
            {cachedOffline ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate(`/read/${id}`)}
                  className="vault-btn-secondary flex items-center gap-2 text-accent-sage border-accent-sage/30"
                >
                  <BookOpenIcon className="w-4 h-4" />
                  Read Offline
                </button>
                <button
                  onClick={handleRemoveDownload}
                  className="p-2 rounded-lg text-vault-muted hover:text-red-400 hover:bg-red-900/20 transition-colors"
                  title="Remove offline copy"
                >
                  <TrashIcon />
                </button>
              </div>
            ) : (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="vault-btn-secondary flex items-center gap-2 hover:text-accent-sage hover:border-accent-sage/50"
              >
                {downloading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-vault-muted/30 border-t-accent-sage rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <DownloadIcon className="w-4 h-4" />
                    Save Offline
                  </>
                )}
              </button>
            )}

            <div className="flex-1" />

            <button
              onClick={handleDelete}
              className="vault-btn-secondary text-red-400 border-red-400/30 hover:bg-red-900/20 flex items-center gap-2"
            >
              <TrashIcon />
              Remove
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-vault-bg rounded-lg">
              <div className="text-2xl font-bold text-vault-text">{formatWordCount(fic.word_count)}</div>
              <div className="text-xs text-vault-muted">Words</div>
            </div>
            <div className="text-center p-3 bg-vault-bg rounded-lg">
              <div className="text-2xl font-bold text-vault-text">
                {fic.chapter_count}{fic.chapter_total ? `/${fic.chapter_total}` : '/?'}
              </div>
              <div className="text-xs text-vault-muted">Chapters</div>
            </div>
            <div className="text-center p-3 bg-vault-bg rounded-lg">
              <div className={`text-2xl font-bold ${fic.status === 'Complete' ? 'text-lj-green-400' : 'text-yellow-400'}`}>
                {fic.status}
              </div>
              <div className="text-xs text-vault-muted">Status</div>
            </div>
            <div className="text-center p-3 bg-vault-bg rounded-lg">
              <div className="text-2xl font-bold text-vault-text">{fic.language || 'English'}</div>
              <div className="text-xs text-vault-muted">Language</div>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-vault-muted uppercase tracking-wider mb-2">Summary</h3>
            <p className="text-vault-text whitespace-pre-wrap">{fic.summary || 'No summary available.'}</p>
          </div>

          {/* Tags Section */}
          <div className="space-y-4">
            {/* Fandoms */}
            {fandoms.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-vault-muted uppercase tracking-wider mb-2">Fandoms</h3>
                <div className="flex flex-wrap gap-2">
                  {fandoms.map((tag, i) => (
                    <span key={i} className="vault-tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Ships */}
            {ships.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-vault-muted uppercase tracking-wider mb-2">Relationships</h3>
                <div className="flex flex-wrap gap-2">
                  {ships.map((tag, i) => (
                    <span key={i} className="vault-tag-green">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Characters */}
            {characters.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-vault-muted uppercase tracking-wider mb-2">Characters</h3>
                <div className="flex flex-wrap gap-2">
                  {characters.map((tag, i) => (
                    <span key={i} className="text-xs text-vault-muted bg-vault-bg px-2 py-1 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && warnings[0] !== 'No Archive Warnings Apply' && (
              <div>
                <h3 className="text-sm font-semibold text-vault-muted uppercase tracking-wider mb-2">Warnings</h3>
                <div className="flex flex-wrap gap-2">
                  {warnings.map((tag, i) => (
                    <span key={i} className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Tags */}
            {tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-vault-muted uppercase tracking-wider mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <span key={i} className="text-xs text-vault-muted bg-vault-bg px-2 py-1 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="mt-6 pt-6 border-t border-vault-border text-sm text-vault-muted">
            <div className="flex flex-wrap gap-6">
              {fic.published_at && (
                <span>Published: {fic.published_at}</span>
              )}
              {fic.updated_at && fic.updated_at !== fic.published_at && (
                <span>Updated: {fic.updated_at}</span>
              )}
              <span>Added to vault: {new Date(fic.date_added).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Personal Notes & Tags */}
        <div className="vault-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <EditIcon className="w-5 h-5" />
              Notes & Tags
            </h2>
            {!editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-sm text-accent-gold hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          {/* Tags inline */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {myTags.map((tag, i) => (
              <span key={i} className="text-xs bg-accent-gold/15 text-accent-gold px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
            {myTags.length === 0 && !editingNotes && (
              <span className="text-xs text-vault-muted italic">No tags yet — tap Edit to add</span>
            )}
          </div>

          {/* Notes display or empty */}
          {!editingNotes && (
            fic.notes ? (
              <p className="text-vault-text text-sm whitespace-pre-wrap">{fic.notes}</p>
            ) : (
              <p className="text-vault-muted text-sm italic">No notes yet.</p>
            )
          )}

          {/* Editing mode */}
          {editingNotes && (
            <div className="space-y-3 mt-2">
              {/* Tag input */}
              <input
                type="text"
                placeholder="Add tag + Enter (e.g. comfort-fic)"
                className="vault-input text-sm w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    const newTag = e.target.value.trim().replace(/^#/, '')
                    if (newTag && !myTags.includes(newTag)) {
                      const updated = [...myTags, newTag]
                      const newTagString = updated.join(', ')
                      setPersonalTags(newTagString)
                      apiFetch(`${API_URL}/fics/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ personal_tags: newTagString }),
                      }).then(() => {
                        setFic(prev => ({ ...prev, personal_tags: newTagString }))
                        toast.success(`Added #${newTag}`)
                      })
                    }
                    e.target.value = ''
                  }
                }}
              />

              {/* Removable tag pills */}
              {myTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {myTags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-accent-gold/15 text-accent-gold px-2 py-0.5 rounded-full">
                      #{tag}
                      <button
                        onClick={() => {
                          const updated = myTags.filter((_, idx) => idx !== i)
                          const newTagString = updated.join(', ')
                          setPersonalTags(newTagString)
                          apiFetch(`${API_URL}/fics/${id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ personal_tags: newTagString }),
                          }).then(() => {
                            setFic(prev => ({ ...prev, personal_tags: newTagString }))
                            toast.success(`Removed #${tag}`)
                          })
                        }}
                        className="hover:text-red-400"
                      >×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Notes textarea */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Your thoughts, where you left off, favorite moments..."
                className="vault-input min-h-[100px] resize-y text-sm w-full"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => { handleSaveNotes(); toast.success('Saved!') }} className="vault-btn-primary text-sm">
                  Save
                </button>
                <button onClick={() => { setNotes(fic.notes || ''); setEditingNotes(false) }} className="vault-btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reactions Section */}
        <div className="vault-card mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-xl">✨</span>
              Your Reactions
            </h2>
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-all ${
                showReactionPicker
                  ? 'bg-vault-bg text-vault-muted'
                  : 'bg-accent-gold/20 text-accent-gold hover:bg-accent-gold/30'
              }`}
            >
              {showReactionPicker ? 'Close' : '+ Add Reaction'}
            </button>
          </div>

          {showReactionPicker && (
            <div className="mb-6 p-4 bg-vault-bg rounded-xl border border-vault-border">
              <ReactionPicker
                ficId={fic.id}
                onReactionAdded={handleReactionAdded}
              />
            </div>
          )}

          <ReactionsDisplay
            reactions={reactions}
            onDelete={handleReactionDeleted}
          />
        </div>

        {/* Notification Settings — WIPs only */}
        {fic.status === 'WIP' && (
          <div className="mt-6">
            <NotificationSettings ficId={fic.id} ficStatus={fic.status} />
          </div>
        )}

        {/* Read Count & Elite Vault Info */}
        <div className="vault-card mt-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📊</span>
            <h3 className="text-lg font-semibold">Reading Stats</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-vault-bg rounded-lg">
              <div className="text-2xl font-bold text-vault-text">{fic.times_read || 0}</div>
              <div className="text-xs text-vault-muted">Times Read</div>
            </div>
            <div className="text-center p-3 bg-vault-bg rounded-lg">
              <div className="text-2xl font-bold text-vault-text">
                {fic.in_elite_vault ? '🏆' : (fic.times_read || 0) >= 5 ? '✅' : `${5 - (fic.times_read || 0)} more`}
              </div>
              <div className="text-xs text-vault-muted">
                {fic.in_elite_vault ? 'Elite Status' : (fic.times_read || 0) >= 5 ? 'Elite Eligible' : 'Until Elite'}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import {
  ArrowLeftIcon, HeartIcon, ExternalLinkIcon, BookOpenIcon,
  EditIcon, TagIcon, TrashIcon
} from '../components/Icons'
import { API_URL } from '../config'

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

  useEffect(() => {
    fetchFic()
  }, [id])

  const fetchFic = async () => {
    try {
      const response = await fetch(`${API_URL}/fics/${id}`)
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

  const handleToggleFavorite = async () => {
    try {
      const newFavorite = !fic.favorite
      await fetch(`${API_URL}/fics/${id}`, {
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
      await fetch(`${API_URL}/fics/${id}`, {
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

  const handleDelete = async () => {
    if (!confirm('Remove this fic from your vault?')) return

    try {
      await fetch(`${API_URL}/fics/${id}`, { method: 'DELETE' })
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

        {/* Personal Notes Section */}
        <div className="vault-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <EditIcon className="w-5 h-5" />
              My Notes
            </h2>
            {!editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-sm text-lj-blue-400 hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          {editingNotes ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-vault-muted mb-1">Personal Tags</label>
                <input
                  type="text"
                  value={personalTags}
                  onChange={(e) => setPersonalTags(e.target.value)}
                  placeholder="comfort-fic, re-read, rec-from-friend..."
                  className="vault-input"
                />
                <p className="text-xs text-vault-muted mt-1">Comma-separated tags for your own organization</p>
              </div>

              <div>
                <label className="block text-sm text-vault-muted mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Your thoughts, where you left off, why you saved this..."
                  className="vault-input min-h-[120px] resize-y"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={handleSaveNotes} className="vault-btn-primary">
                  Save Notes
                </button>
                <button onClick={() => setEditingNotes(false)} className="vault-btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {myTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {myTags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs text-lj-blue-300 bg-lj-blue-900/30 px-2 py-1 rounded">
                      <TagIcon className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {fic.notes ? (
                <p className="text-vault-text whitespace-pre-wrap">{fic.notes}</p>
              ) : (
                <p className="text-vault-muted italic">No notes yet. Click Edit to add your thoughts.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

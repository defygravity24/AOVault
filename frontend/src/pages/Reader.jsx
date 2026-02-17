import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeftIcon, ExternalLinkIcon } from '../components/Icons'
import { API_URL } from '../config'

export default function Reader() {
  const { id } = useParams()
  const [fic, setFic] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFic()
  }, [id])

  const fetchFic = async () => {
    try {
      const response = await fetch(`${API_URL}/fics/${id}`)
      const data = await response.json()
      if (data.fic) {
        setFic(data.fic)
      }
    } catch (err) {
      console.error('Failed to fetch fic:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-bg flex items-center justify-center">
        <div className="animate-pulse text-vault-muted">Loading...</div>
      </div>
    )
  }

  if (!fic) {
    return (
      <div className="min-h-screen bg-vault-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-vault-muted mb-4">Fic not found</p>
          <Link to="/" className="vault-btn-primary">Back to Library</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-vault-bg">
      {/* Header */}
      <header className="border-b border-vault-border bg-vault-card/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/fic/${id}`}
              className="p-2 rounded-lg hover:bg-vault-border transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-semibold line-clamp-1">{fic.title}</h1>
              <p className="text-sm text-vault-muted">{fic.author}</p>
            </div>
          </div>
          <a
            href={fic.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="vault-btn-secondary flex items-center gap-2"
          >
            <ExternalLinkIcon className="w-4 h-4" />
            Read on AO3
          </a>
        </div>
      </header>

      {/* Reader Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="vault-card text-center py-12">
          <h2 className="text-xl font-semibold mb-4">EPUB Reader</h2>
          <p className="text-vault-muted mb-6">
            The full EPUB reader is available in the web version.<br />
            For the best mobile reading experience, tap the button above to read on AO3.
          </p>

          {fic.epub_path && (
            <div className="space-y-4">
              <p className="text-sm text-vault-muted">
                Your copy is safely stored in your vault.
              </p>
              <a
                href={`${API_URL}/fics/${id}/epub`}
                download={`${fic.title}.epub`}
                className="vault-btn-primary inline-flex items-center gap-2"
              >
                Download EPUB
              </a>
            </div>
          )}
        </div>

        {/* Fic Summary Card */}
        <div className="vault-card mt-6">
          <h3 className="font-semibold mb-2">Summary</h3>
          <p className="text-vault-muted text-sm whitespace-pre-wrap">
            {fic.summary || 'No summary available.'}
          </p>

          <div className="mt-4 pt-4 border-t border-vault-border flex flex-wrap gap-4 text-sm text-vault-muted">
            <span>{fic.word_count?.toLocaleString()} words</span>
            <span>{fic.chapter_count} chapters</span>
            <span className={fic.status === 'Complete' ? 'text-lj-green-400' : 'text-yellow-400'}>
              {fic.status}
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}

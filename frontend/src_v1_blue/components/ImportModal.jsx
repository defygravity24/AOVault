import { useState } from 'react'
import { API_URL } from '../config'

export default function ImportModal({ isOpen, onClose, onImportSuccess }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImport = async (e) => {
    e.preventDefault()
    if (!url) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/fics/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import fic')
      }

      setUrl('')
      onClose()
      onImportSuccess(data.fic)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-vault-card border border-vault-border rounded-xl max-w-lg w-full p-6 shadow-vault-lg">
        <h2 className="text-xl font-semibold mb-2">Save a Fic</h2>
        <p className="text-vault-muted text-sm mb-4">
          Paste an AO3 link to save it to your vault forever.
        </p>

        <form onSubmit={handleImport}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://archiveofourown.org/works/..."
            className="vault-input mb-2"
            autoFocus
          />

          {error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}

          <div className="flex gap-3 justify-end mt-4">
            <button type="button" onClick={onClose} className="vault-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading || !url} className="vault-btn-primary disabled:opacity-50">
              {loading ? 'Importing...' : 'Save to Vault'}
            </button>
          </div>
        </form>

        <p className="text-vault-muted text-xs mt-4">
          FFN support coming soon. AO3 works are downloaded as EPUB for offline reading.
        </p>
      </div>
    </div>
  )
}

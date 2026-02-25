import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { API_URL, apiFetch } from '../config'
import { CloseIcon } from './Icons'

export default function ImportModal({ isOpen, onClose, onImportSuccess }) {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingFic, setExistingFic] = useState(null)

  const handleImport = async (e) => {
    e.preventDefault()
    if (!url) return

    setLoading(true)
    setError('')
    setExistingFic(null)

    const loadingToast = toast.loading('Importing from AO3...')

    try {
      let response = await apiFetch(`${API_URL}/fics/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      let data = await response.json()

      // Server can't reach AO3 — fetch via CF Worker proxy from client, then relay HTML
      if (response.status === 422 && data.needsClientFetch) {
        toast.dismiss(loadingToast)
        const relayToast = toast.loading('Fetching from AO3 directly...')
        try {
          const workerUrl = 'https://ao3-proxy.defy-gravity-24-sda.workers.dev'
          const ao3Response = await fetch(`${workerUrl}/?url=${encodeURIComponent(url)}`)
          let html
          if (!ao3Response.ok) {
            // CF Worker also failed — try fetching AO3 directly from browser
            const directResponse = await fetch(url, { mode: 'cors' }).catch(() => null)
            if (directResponse?.ok) {
              html = await directResponse.text()
            } else {
              throw new Error('AO3 is temporarily unavailable. Please try again in a minute.')
            }
          } else {
            html = await ao3Response.text()
          }
          // Send the fetched HTML to our server for parsing
          response = await apiFetch(`${API_URL}/fics/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, html }),
          })
          data = await response.json()
          toast.dismiss(relayToast)
        } catch (relayErr) {
          toast.dismiss(relayToast)
          throw new Error(relayErr.message || 'Could not reach AO3. Please try again in a minute.')
        }
      }

      if (response.status === 409 && data.alreadySaved) {
        toast.dismiss(loadingToast)
        setExistingFic({ id: data.ficId, title: data.title })
        setError('')
        setLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import fic')
      }

      toast.dismiss(loadingToast)
      setUrl('')
      onClose()
      onImportSuccess(data.fic)
    } catch (err) {
      toast.dismiss(loadingToast)
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setUrl('')
    setError('')
    setExistingFic(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div
        className="bg-vault-card border border-vault-border rounded-xl max-w-lg w-full p-6 shadow-vault-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Save a Fic</h2>
            <p className="text-vault-muted text-sm mt-1">
              Paste an AO3 link to save it to your vault forever.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-vault-bg text-vault-muted hover:text-vault-text transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleImport}>
          <div className="relative">
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError('') }}
              placeholder="https://archiveofourown.org/works/..."
              className="vault-input text-base"
              autoFocus
              disabled={loading}
            />
          </div>

          {/* URL validation hint */}
          {url && !url.includes('archiveofourown.org/works/') && (
            <p className="text-yellow-400/70 text-xs mt-2">
              Paste a full AO3 work URL (e.g. https://archiveofourown.org/works/12345)
            </p>
          )}

          {error && (
            <p className="text-red-400 text-sm mt-2 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Already saved — show link to existing fic */}
          {existingFic && (
            <div className="mt-3 p-3 bg-accent-gold/10 border border-accent-gold/30 rounded-lg">
              <p className="text-accent-gold text-sm font-medium mb-2">
                "{existingFic.title}" is already in your vault!
              </p>
              <button
                onClick={() => {
                  setUrl('')
                  setExistingFic(null)
                  onClose()
                  navigate(`/fic/${existingFic.id}`)
                }}
                className="text-sm text-accent-gold hover:underline"
              >
                → View in your vault
              </button>
            </div>
          )}

          <div className="flex gap-3 justify-end mt-5">
            <button type="button" onClick={handleClose} className="vault-btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !url}
              className="vault-btn-primary disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                'Save to Vault'
              )}
            </button>
          </div>
        </form>

        <p className="text-vault-muted text-xs mt-4 text-center">
          Works are saved with full metadata and downloaded as EPUB for offline reading.
          <br />
          <span className="text-vault-muted/50">FFN &amp; Wattpad support coming soon.</span>
        </p>
      </div>
    </div>
  )
}

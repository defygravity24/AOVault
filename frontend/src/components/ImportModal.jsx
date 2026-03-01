import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { API_URL, apiFetch } from '../config'
import { CloseIcon } from './Icons'

const WORKER_URL = 'https://ao3-proxy.defy-gravity-24-sda.workers.dev'

export default function ImportModal({ isOpen, onClose, onImportSuccess }) {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingFic, setExistingFic] = useState(null)
  const [retryCountdown, setRetryCountdown] = useState(0)
  const retryTimerRef = useRef(null)

  // Countdown timer for auto-retry
  useEffect(() => {
    if (retryCountdown <= 0) return
    retryTimerRef.current = setTimeout(() => {
      setRetryCountdown(prev => prev - 1)
    }, 1000)
    return () => clearTimeout(retryTimerRef.current)
  }, [retryCountdown])

  // Auto-retry when countdown hits zero
  useEffect(() => {
    if (retryCountdown === 0 && loading) {
      // Countdown just finished — trigger retry
      handleImport(null, true)
    }
  }, [retryCountdown])

  // Track last rate limit info so we can surface it even if Promise.any swallows details
  const lastRateLimitRef = useRef(null)

  const fetchFromAO3 = async (targetUrl) => {
    // Ensure view_adult=true in the URL
    const ao3Url = new URL(targetUrl)
    if (!ao3Url.searchParams.has('view_adult')) {
      ao3Url.searchParams.set('view_adult', 'true')
    }
    const fullUrl = ao3Url.toString()
    lastRateLimitRef.current = null

    // Race: CF Worker proxy vs direct browser fetch
    const fetchPromises = [
      fetch(`${WORKER_URL}/?url=${encodeURIComponent(fullUrl)}`)
        .then(async r => {
          if (r.ok) return r.text()
          // Parse rate limit info from worker response
          const body = await r.json().catch(() => ({}))
          if (r.status === 429 || body.rateLimited) {
            // Stash rate limit info where the caller can always find it
            lastRateLimitRef.current = { retryAfter: body.retryAfter || 60 }
            const err = new Error('rate_limited')
            err.retryAfter = body.retryAfter || 60
            throw err
          }
          throw new Error(`CF Worker returned ${r.status}`)
        }),
      fetch(fullUrl, { mode: 'cors' })
        .then(r => r.ok ? r.text() : Promise.reject(new Error('Direct fetch failed')))
        .catch(() => Promise.reject(new Error('CORS blocked'))),
    ]

    return Promise.any(fetchPromises)
  }

  const handleImport = async (e, isRetry = false) => {
    if (e) e.preventDefault()
    if (!url) return

    setLoading(true)
    setError('')
    setExistingFic(null)
    setRetryCountdown(0)

    const loadingToast = toast.loading(isRetry ? 'Retrying AO3 import...' : 'Importing from AO3...')

    try {
      // Step 1: Ask server to fetch + parse
      let response = await apiFetch(`${API_URL}/fics/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      let data = await response.json()

      // Step 2: Server can't reach AO3 — try browser-side strategies
      if (response.status === 422 && data.needsClientFetch) {
        toast.dismiss(loadingToast)

        // Strategy A: Download EPUB via CF Worker (most reliable — different AO3 endpoint)
        const workId = url.match(/archiveofourown\.org\/works\/(\d+)/)?.[1]
        if (workId) {
          const epubToast = toast.loading('Downloading fic via backup method...')
          try {
            const epubUrl = `https://archiveofourown.org/downloads/${workId}/work.epub`
            const epubRes = await fetch(`${WORKER_URL}/?url=${encodeURIComponent(epubUrl)}`)
            if (epubRes.ok) {
              const epubJson = await epubRes.json()
              if (epubJson.epub) {
                // Send the EPUB to the server for parsing + saving
                response = await apiFetch(`${API_URL}/fics/import-epub`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url, epubBase64: epubJson.epub }),
                })
                data = await response.json()
                toast.dismiss(epubToast)
                // Fall through to normal success/error handling below
              } else {
                throw new Error('Worker returned no EPUB data')
              }
            } else {
              throw new Error(`Worker EPUB fetch failed: ${epubRes.status}`)
            }
          } catch (epubErr) {
            toast.dismiss(epubToast)
            console.log('EPUB via worker failed:', epubErr.message, '— trying HTML relay')

            // Strategy B: HTML relay (original approach — less reliable but worth trying)
            const relayToast = toast.loading('Fetching from AO3 via proxy...')
            try {
              let html
              try {
                html = await fetchFromAO3(url)
              } catch (fetchErr) {
                let rateLimitInfo = lastRateLimitRef.current
                if (!rateLimitInfo && fetchErr.errors) {
                  const rateLimitErr = fetchErr.errors.find(e => e.message === 'rate_limited')
                  if (rateLimitErr) rateLimitInfo = { retryAfter: rateLimitErr.retryAfter || 60 }
                }
                if (rateLimitInfo) {
                  toast.dismiss(relayToast)
                  const waitSec = Math.min(rateLimitInfo.retryAfter, 90)
                  setRetryCountdown(waitSec)
                  setError(`AO3 is rate limiting. Auto-retrying in ${waitSec}s...`)
                  return
                }
                toast.dismiss(relayToast)
                throw new Error('AO3 is temporarily unavailable. Please try again in a minute.')
              }
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
      onImportSuccess(data.fic, { epubFailed: data.epubFailed })
    } catch (err) {
      toast.dismiss(loadingToast)
      setError(err.message)
      toast.error(err.message)
    } finally {
      if (retryCountdown <= 0) {
        setLoading(false)
      }
    }
  }

  const handleClose = () => {
    setUrl('')
    setError('')
    setExistingFic(null)
    setRetryCountdown(0)
    setLoading(false)
    clearTimeout(retryTimerRef.current)
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
              onChange={(e) => { setUrl(e.target.value); setError(''); setRetryCountdown(0) }}
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
            <div className="text-sm mt-2 bg-red-400/10 px-3 py-2 rounded-lg">
              <p className="text-red-400">{error}</p>
              {retryCountdown > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  <span className="text-red-300 text-xs">
                    Auto-retrying in {retryCountdown}s...
                  </span>
                  <button
                    type="button"
                    onClick={() => { setRetryCountdown(0); setLoading(false); setError('') }}
                    className="text-xs text-vault-muted hover:text-vault-text ml-auto"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
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
            <button type="button" onClick={handleClose} className="vault-btn-secondary" disabled={loading && retryCountdown <= 0}>
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
                  {retryCountdown > 0 ? `Waiting (${retryCountdown}s)...` : 'Importing...'}
                </>
              ) : (
                'Save to Vault'
              )}
            </button>
          </div>

          {/* Slowness warning — shown while loading */}
          {loading && retryCountdown <= 0 && (
            <div className="mt-4 p-3 bg-accent-gold/10 border border-accent-gold/20 rounded-lg text-xs text-vault-muted">
              ⏳ Importing from AO3 can take <span className="text-vault-text">1–2 minutes</span> for longer fics. Please hang tight — it's working!
            </div>
          )}
        </form>

        <p className="text-vault-muted text-xs mt-4 text-center">
          Works are saved with full metadata and downloaded as EPUB for offline reading.
          <br />
          <span className="text-vault-muted/50">
            Having trouble?{' '}
            <a href="mailto:hello@aovault.app" className="text-accent-gold/70 hover:text-accent-gold underline">
              Email support
            </a>
            {' '}· FFN &amp; Wattpad support coming soon.
          </span>
        </p>
      </div>
    </div>
  )
}

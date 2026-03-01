import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeftIcon, ExternalLinkIcon } from '../components/Icons'
import { API_URL, apiFetch } from '../config'
import { getCachedContent, cacheFicContent } from '../utils/offlineCache'

// AO3's preface.xhtml has distinctive metadata classes — skip it as a story chapter
const isPrefaceChapter = (html = '') =>
  html.includes('work meta group') ||
  html.includes('preface group')

export default function Reader() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fic, setFic] = useState(null)
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentChapter, setCurrentChapter] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem('aovault_reader_fontsize') || '18')
  })
  const FONTS = [
    { key: 'serif', label: 'Serif', family: 'Georgia, "Times New Roman", serif' },
    { key: 'sans', label: 'Sans', family: '-apple-system, "Helvetica Neue", Arial, sans-serif' },
    { key: 'mono', label: 'Mono', family: '"Courier New", Courier, monospace' },
  ]
  const [fontKey, setFontKey] = useState(() => {
    return localStorage.getItem('aovault_reader_font') || 'serif'
  })
  const currentFont = FONTS.find(f => f.key === fontKey) || FONTS[0]

  const cycleFont = () => {
    const idx = FONTS.findIndex(f => f.key === fontKey)
    const next = FONTS[(idx + 1) % FONTS.length]
    setFontKey(next.key)
    localStorage.setItem('aovault_reader_font', next.key)
  }

  const THEMES = [
    { key: 'dark', label: 'Dark', bg: '#0d1117', text: '#e0e0e0', card: '#161b22', border: '#2d2d2d', muted: '#8b949e' },
    { key: 'light', label: 'Light', bg: '#ffffff', text: '#1a1a1a', card: '#f6f8fa', border: '#d0d7de', muted: '#656d76' },
    { key: 'sepia', label: 'Sepia', bg: '#f4ecd8', text: '#5b4636', card: '#ece3d0', border: '#d4c9b0', muted: '#8a7b6b' },
  ]
  const [themeKey, setThemeKey] = useState(() => {
    return localStorage.getItem('aovault_reader_theme') || 'dark'
  })
  const currentTheme = THEMES.find(t => t.key === themeKey) || THEMES[0]

  const cycleTheme = () => {
    const idx = THEMES.findIndex(t => t.key === themeKey)
    const next = THEMES[(idx + 1) % THEMES.length]
    setThemeKey(next.key)
    localStorage.setItem('aovault_reader_theme', next.key)
  }

  // Filter out the AO3 preface chapter (fandom tags, metadata HTML)
  // so only actual story chapters are shown
  const storyChapters = useMemo(() => {
    if (!content?.chapters) return []
    return content.chapters.filter(ch => !isPrefaceChapter(ch.html))
  }, [content])

  useEffect(() => {
    loadContent()
  }, [id])

  const loadContent = async () => {
    try {
      // 1. Check IndexedDB first — instant, works fully offline
      const cached = await getCachedContent(parseInt(id))
      if (cached) {
        setContent(cached)
      }

      // 2. If not cached locally, fetch from server and auto-save to IndexedDB.
      //    This means any fic you open once becomes available offline everywhere — no
      //    manual "Save Offline" needed on each device.
      if (!cached) {
        try {
          const response = await apiFetch(`${API_URL}/fics/${id}/content`)
          const data = await response.json()
          if (data.chapters?.length) {
            await cacheFicContent(parseInt(id), data)
            setContent(data)
            // Notify any mounted FicCard to flip its button to "Read Offline"
            window.dispatchEvent(new CustomEvent('aovault:fic-cached', { detail: { ficId: parseInt(id) } }))
          }
        } catch {
          // Server unavailable — content stays null → "Not Downloaded Yet" fallback shown
        }
      }

      // 3. Also fetch fic metadata for the info panel (non-critical)
      try {
        const response = await apiFetch(`${API_URL}/fics/${id}`)
        const data = await response.json()
        if (data.fic) setFic(data.fic)
      } catch {
        // Offline — fine if we already have content
      }
    } catch (err) {
      console.error('Reader load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const changeFontSize = (delta) => {
    setFontSize(prev => {
      const next = Math.max(14, Math.min(28, prev + delta))
      localStorage.setItem('aovault_reader_fontsize', next.toString())
      return next
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-bg flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-vault-muted/30 border-t-accent-gold rounded-full animate-spin" />
      </div>
    )
  }

  // No cached content — show fallback
  if (!content) {
    return (
      <div className="min-h-screen bg-vault-bg">
        <header className="border-b border-vault-border bg-vault-card/90 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-vault-border transition-colors">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold line-clamp-1">{fic?.title || 'Reader'}</h1>
              <p className="text-sm text-vault-muted">{fic?.author}</p>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="vault-card text-center py-12">
            <p className="text-4xl mb-4">📖</p>
            <h2 className="text-xl font-semibold mb-3">Not Downloaded Yet</h2>
            <p className="text-vault-muted mb-6">
              Download this fic first to read it offline.
            </p>
            <button
              onClick={() => navigate(`/fic/${id}`)}
              className="vault-btn-primary"
            >
              Go to Fic Details
            </button>
            {fic?.source_url && (
              <a
                href={fic.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="vault-btn-secondary flex items-center gap-2 mt-3 justify-center"
              >
                <ExternalLinkIcon className="w-4 h-4" />
                Read on AO3
              </a>
            )}
          </div>
        </main>
      </div>
    )
  }

  // Render cached content — using storyChapters (preface filtered out)
  const chapter = storyChapters[currentChapter]
  const totalChapters = storyChapters.length

  // Bail out if all chapters were filtered (shouldn't happen, but be safe)
  if (totalChapters === 0) {
    return (
      <div className="min-h-screen bg-vault-bg flex items-center justify-center">
        <p className="text-vault-muted">No readable chapters found.</p>
      </div>
    )
  }

  const themeStyle = {
    backgroundColor: currentTheme.bg,
    color: currentTheme.text,
  }
  const barStyle = {
    backgroundColor: currentTheme.bg + 'ee',
    borderColor: currentTheme.border,
  }
  const btnStyle = {
    backgroundColor: currentTheme.card,
    borderColor: currentTheme.border,
    color: currentTheme.text,
  }

  return (
    <div className="min-h-screen" style={themeStyle}>
      {/* Top bar */}
      <div className="sticky top-0 z-10 backdrop-blur border-b px-4 py-3" style={barStyle}>
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>

          <div className="text-center flex-1 mx-4 truncate">
            <p className="text-sm font-medium truncate">{content.title}</p>
            <p className="text-xs" style={{ color: currentTheme.muted }}>{content.author}</p>
          </div>

          {/* Controls: font size, font family, theme */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => changeFontSize(-2)}
              className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-bold"
              style={btnStyle}
            >
              A-
            </button>
            <button
              onClick={() => changeFontSize(2)}
              className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-bold"
              style={btnStyle}
            >
              A+
            </button>
            <button
              onClick={cycleFont}
              className="w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold"
              style={{ ...btnStyle, fontFamily: currentFont.family }}
              title={`Font: ${currentFont.label}`}
            >
              Aa
            </button>
            <button
              onClick={cycleTheme}
              className="w-8 h-8 rounded-lg border flex items-center justify-center"
              style={btnStyle}
              title={`Theme: ${currentTheme.label}`}
            >
              {themeKey === 'dark' ? '🌙' : themeKey === 'light' ? '☀️' : '📜'}
            </button>
          </div>
        </div>
      </div>

      {/* Chapter navigation (if multi-chapter) */}
      {totalChapters > 1 && (
        <div className="border-b px-4 py-2" style={{ borderColor: currentTheme.border }}>
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <button
              onClick={() => { setCurrentChapter(prev => prev - 1); window.scrollTo(0, 0) }}
              disabled={currentChapter === 0}
              className="text-sm disabled:opacity-40"
              style={{ color: currentChapter === 0 ? currentTheme.muted : currentTheme.text }}
            >
              Prev
            </button>
            <span className="text-sm" style={{ color: currentTheme.muted }}>
              {chapter.title || `Chapter ${currentChapter + 1}`} ({currentChapter + 1}/{totalChapters})
            </span>
            <button
              onClick={() => { setCurrentChapter(prev => prev + 1); window.scrollTo(0, 0) }}
              disabled={currentChapter >= totalChapters - 1}
              className="text-sm disabled:opacity-40"
              style={{ color: currentChapter >= totalChapters - 1 ? currentTheme.muted : currentTheme.text }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-6" style={{ fontFamily: currentFont.family }}>

        {/* Fic info panel — shown above chapter 1 */}
        {currentChapter === 0 && fic && (
          <div className="mb-8 rounded-xl border overflow-hidden" style={{ borderColor: currentTheme.border }}>
            {/* Collapsed toggle bar */}
            <button
              onClick={() => setShowInfo(prev => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              style={{ backgroundColor: currentTheme.card }}
            >
              <div>
                <p className="font-semibold text-sm">{fic.title}</p>
                <p className="text-xs mt-0.5" style={{ color: currentTheme.muted }}>
                  by {fic.author}
                  {fic.word_count ? ` · ${Math.round(fic.word_count / 1000)}k words` : ''}
                  {fic.status ? ` · ${fic.status}` : ''}
                </p>
              </div>
              <span className="text-xs ml-4 shrink-0" style={{ color: currentTheme.muted }}>
                {showInfo ? 'Hide info ▲' : 'Show info ▼'}
              </span>
            </button>

            {showInfo && (
              <div className="px-4 pb-4 pt-1 space-y-3" style={{ backgroundColor: currentTheme.card }}>
                {/* Fandom & ship */}
                {(fic.fandom || fic.ship) && (
                  <div className="flex flex-wrap gap-1.5">
                    {fic.fandom?.split(',').map((f, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full border"
                        style={{ borderColor: currentTheme.border, color: currentTheme.muted }}>
                        {f.trim()}
                      </span>
                    ))}
                    {fic.ship?.split(',').map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full border"
                        style={{ borderColor: currentTheme.border, color: currentTheme.text }}>
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Summary */}
                {fic.summary && (
                  <div>
                    <p className="text-xs uppercase tracking-wide mb-1" style={{ color: currentTheme.muted }}>Summary</p>
                    <p className="text-sm leading-relaxed" style={{ color: currentTheme.text }}>{fic.summary}</p>
                  </div>
                )}

                {/* Tags */}
                {fic.tags && (
                  <div>
                    <p className="text-xs uppercase tracking-wide mb-1" style={{ color: currentTheme.muted }}>Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {fic.tags.split(',').map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded border"
                          style={{ borderColor: currentTheme.border, color: currentTheme.muted }}>
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Author notes (preNote from content) */}
                {content.preNote && (
                  <div>
                    <p className="text-xs uppercase tracking-wide mb-1" style={{ color: currentTheme.muted }}>Author's Note</p>
                    <div className="text-sm leading-relaxed reader-content"
                      style={{ color: currentTheme.text }}
                      dangerouslySetInnerHTML={{ __html: content.preNote }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chapter text */}
        <div
          className="reader-content leading-relaxed"
          style={{ fontSize, color: currentTheme.text }}
          dangerouslySetInnerHTML={{ __html: chapter.html }}
        />

        {/* Author end note */}
        {currentChapter === totalChapters - 1 && content.endNote && (
          <div className="mt-8 p-4 rounded-lg border" style={{ backgroundColor: currentTheme.card, borderColor: currentTheme.border }}>
            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: currentTheme.muted }}>End Notes</p>
            <div
              className="reader-content text-sm"
              style={{ fontSize: fontSize - 2, color: currentTheme.text }}
              dangerouslySetInnerHTML={{ __html: content.endNote }}
            />
          </div>
        )}

        {/* Bottom chapter nav */}
        {totalChapters > 1 && (
          <div className="flex items-center justify-between mt-8 pt-4 border-t" style={{ borderColor: currentTheme.border }}>
            <button
              onClick={() => { setCurrentChapter(prev => prev - 1); window.scrollTo(0, 0) }}
              disabled={currentChapter === 0}
              className="px-4 py-2 rounded-lg border text-sm disabled:opacity-30"
              style={btnStyle}
            >
              Previous Chapter
            </button>
            <button
              onClick={() => { setCurrentChapter(prev => prev + 1); window.scrollTo(0, 0) }}
              disabled={currentChapter >= totalChapters - 1}
              className="px-4 py-2 rounded-lg border text-sm disabled:opacity-30"
              style={btnStyle}
            >
              Next Chapter
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

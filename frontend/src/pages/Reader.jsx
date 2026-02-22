import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeftIcon, ExternalLinkIcon } from '../components/Icons'
import { API_URL, apiFetch } from '../config'
import { getCachedContent } from '../utils/offlineCache'

export default function Reader() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fic, setFic] = useState(null)
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentChapter, setCurrentChapter] = useState(0)
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

  useEffect(() => {
    loadContent()
  }, [id])

  const loadContent = async () => {
    try {
      // Try to load cached content first (works offline)
      const cached = await getCachedContent(parseInt(id))
      if (cached) {
        setContent(cached)
      }

      // Also fetch fic metadata (for fallback display)
      try {
        const response = await apiFetch(`${API_URL}/fics/${id}`)
        const data = await response.json()
        if (data.fic) setFic(data.fic)
      } catch {
        // Offline — that's fine if we have cached content
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

  // Render cached content
  const chapter = content.chapters[currentChapter]
  const totalChapters = content.chapters.length

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
        {/* Author pre-note */}
        {currentChapter === 0 && content.preNote && (
          <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: currentTheme.card, borderColor: currentTheme.border }}>
            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: currentTheme.muted }}>Author's Note</p>
            <div
              className="reader-content text-sm"
              style={{ fontSize: fontSize - 2, color: currentTheme.text }}
              dangerouslySetInnerHTML={{ __html: content.preNote }}
            />
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

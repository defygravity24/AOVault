import { Link } from 'react-router-dom'
import { HeartIcon, ExternalLinkIcon, TrashIcon, BookOpenIcon } from './Icons'
import ShipPill from './ShipPill'

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

export default function FicCard({ fic, onDelete, onToggleFavorite, onShipClick }) {
  const tags = parseTags(fic.tags)
  const ships = parseShips(fic.ship)
  const chapters = fic.chapter_total
    ? `${fic.chapter_count}/${fic.chapter_total}`
    : `${fic.chapter_count}/?`

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

      {/* Ships — BIG and prominent */}
      {ships.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {ships.map((ship, i) => (
            <ShipPill
              key={i}
              ship={ship}
              size={i === 0 ? 'md' : 'sm'}
              onClick={onShipClick}
            />
          ))}
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

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.slice(0, 4).map((tag, i) => (
            <span key={i} className="text-xs text-vault-muted bg-vault-bg px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
          {tags.length > 4 && (
            <span className="text-xs text-vault-muted">+{tags.length - 4} more</span>
          )}
        </div>
      )}

      {/* Footer: Stats */}
      <div className="flex items-center justify-between text-xs text-vault-muted border-t border-vault-border pt-3">
        <div className="flex items-center gap-3">
          <span>{formatWordCount(fic.word_count)} words</span>
          <span>{chapters} ch</span>
        </div>
        <span className={fic.status === 'Complete' ? 'text-accent-sage' : 'text-yellow-400'}>
          {fic.status}
        </span>
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

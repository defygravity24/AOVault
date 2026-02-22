import { useState } from 'react'
import toast from 'react-hot-toast'
import { API_URL, apiFetch } from '../config'

// Compact view for FicCard — shows top 3 reaction emojis
export function ReactionsCompact({ reactions = [] }) {
  if (reactions.length === 0) return null

  // Group by reaction code, pick top 3 by count
  const grouped = {}
  reactions.forEach(r => {
    if (!grouped[r.reaction_code]) {
      grouped[r.reaction_code] = { emoji: r.emoji, label: r.label, count: 0, maxIntensity: 0 }
    }
    grouped[r.reaction_code].count++
    grouped[r.reaction_code].maxIntensity = Math.max(grouped[r.reaction_code].maxIntensity, r.intensity)
  })

  const top = Object.values(grouped)
    .sort((a, b) => b.maxIntensity - a.maxIntensity || b.count - a.count)
    .slice(0, 3)

  return (
    <div className="flex items-center gap-1">
      {top.map((r, i) => (
        <span
          key={i}
          className="text-sm"
          title={`${r.label} (${r.count})`}
        >
          {r.emoji}
        </span>
      ))}
      {reactions.length > 3 && (
        <span className="text-xs text-vault-muted">+{reactions.length - 3}</span>
      )}
    </div>
  )
}

// Full display for FicDetail — shows all reactions with intensity and notes
export default function ReactionsDisplay({ reactions = [], onDelete }) {
  if (reactions.length === 0) {
    return (
      <p className="text-sm text-vault-muted italic">
        No reactions yet. How did this fic make you feel?
      </p>
    )
  }

  const handleDelete = async (reactionId) => {
    try {
      await apiFetch(`${API_URL}/reactions/${reactionId}`, { method: 'DELETE' })
      onDelete?.(reactionId)
      toast.success('Reaction removed')
    } catch (err) {
      toast.error('Failed to remove reaction')
    }
  }

  return (
    <div className="space-y-2">
      {reactions.map(reaction => (
        <div
          key={reaction.id}
          className="flex items-start gap-3 p-3 bg-vault-card border border-vault-border rounded-lg group"
        >
          {/* Emoji with intensity */}
          <div className="flex-shrink-0 text-center">
            <div className="text-xl leading-none">
              {Array.from({ length: reaction.intensity }, (_, i) => (
                <span key={i}>{reaction.emoji}</span>
              ))}
            </div>
            <div className="text-[10px] text-vault-muted mt-1 font-medium">
              {reaction.label}
            </div>
          </div>

          {/* Note & Meta */}
          <div className="flex-1 min-w-0">
            {reaction.note && (
              <p className="text-sm text-vault-text">{reaction.note}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-vault-muted mt-1">
              {reaction.chapter_number && (
                <span>Ch. {reaction.chapter_number}</span>
              )}
              <span>{new Date(reaction.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Delete button (visible on hover) */}
          <button
            onClick={() => handleDelete(reaction.id)}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity
                       text-vault-muted hover:text-red-400 p-1"
            title="Remove reaction"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

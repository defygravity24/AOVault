import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { API_URL, apiFetch } from '../config'

export default function ReactionPicker({ ficId, onReactionAdded }) {
  const [reactionTypes, setReactionTypes] = useState([])
  const [selected, setSelected] = useState(null)
  const [intensity, setIntensity] = useState(3)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchReactionTypes()
  }, [])

  const fetchReactionTypes = async () => {
    try {
      const response = await apiFetch(`${API_URL}/reactions/types`)
      const data = await response.json()
      setReactionTypes(data.types || [])
    } catch (err) {
      console.error('Failed to fetch reaction types:', err)
    }
  }

  const handleSelect = (code) => {
    setSelected(prev => prev === code ? null : code)
    setIntensity(3)
    setNote('')
  }

  const handleSave = async () => {
    if (!selected) return

    setSaving(true)
    try {
      const response = await apiFetch(`${API_URL}/fics/${ficId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reaction_code: selected,
          intensity,
          note: note.trim() || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      onReactionAdded?.(data.reaction)
      setSelected(null)
      setIntensity(3)
      setNote('')

      const type = reactionTypes.find(t => t.code === selected)
      toast.success(`${type?.emoji} ${type?.label} added!`)
    } catch (err) {
      toast.error(err.message || 'Failed to add reaction')
    } finally {
      setSaving(false)
    }
  }

  const selectedType = reactionTypes.find(t => t.code === selected)

  return (
    <div className="space-y-4">
      {/* Reaction Grid */}
      <div className="grid grid-cols-4 gap-2">
        {reactionTypes.map(type => (
          <button
            key={type.code}
            onClick={() => handleSelect(type.code)}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-xl transition-all
              ${selected === type.code
                ? 'bg-accent-gold/20 border-2 border-accent-gold scale-105'
                : 'bg-vault-card border-2 border-vault-border hover:border-vault-muted hover:bg-vault-bg'
              }
            `}
          >
            <span className="text-2xl">{type.emoji}</span>
            <span className="text-[10px] font-medium text-vault-muted leading-tight text-center">
              {type.label}
            </span>
          </button>
        ))}
      </div>

      {/* Intensity & Note (shown when a reaction is selected) */}
      {selected && (
        <div className="space-y-3 animate-fade-in">
          {/* Intensity Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-vault-muted">Intensity</span>
              <span className="text-lg">
                {Array.from({ length: intensity }, (_, i) => selectedType?.emoji).join('')}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={intensity}
              onChange={(e) => setIntensity(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer
                         bg-vault-border accent-accent-gold"
            />
            <div className="flex justify-between text-xs text-vault-muted mt-1">
              <span>Mild</span>
              <span>MAXIMUM</span>
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)..."
              className="vault-input text-sm w-full"
              maxLength={200}
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="vault-btn-primary w-full text-sm"
          >
            {saving ? 'Saving...' : `Add ${selectedType?.emoji} ${selectedType?.label}`}
          </button>
        </div>
      )}
    </div>
  )
}

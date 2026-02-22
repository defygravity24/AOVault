import { useState } from 'react'
import { CloseIcon } from './Icons'

// Icon for "Add new collection"
const PlusIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const ChevronIcon = ({ className = "w-4 h-4", open }) => (
  <svg className={`${className} transition-transform duration-200 ${open ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9,18 15,12 9,6" />
  </svg>
)

export default function Sidebar({
  collections,
  activeCollectionId,
  onSelectCollection,
  onCreateCollection,
  isOpen,
  onClose,
}) {
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📚')
  const [smartExpanded, setSmartExpanded] = useState(true)
  const [customExpanded, setCustomExpanded] = useState(true)

  const smartCollections = collections.filter(c => c.is_smart)
  const customCollections = collections.filter(c => !c.is_smart)

  const handleCreate = (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    onCreateCollection({ name: newName.trim(), icon: newIcon })
    setNewName('')
    setNewIcon('📚')
    setShowNewForm(false)
  }

  const emojiOptions = ['📚', '🔥', '💕', '⭐', '🌙', '🗡️', '🏰', '🌊', '🎭', '💀', '🦋', '🌸']

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Mobile close button */}
      <div className="flex items-center justify-between p-4 lg:hidden border-b border-vault-border">
        <span className="text-sm font-semibold text-vault-text">Collections</span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-vault-bg text-vault-muted hover:text-vault-text">
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Smart Collections */}
        <button
          onClick={() => setSmartExpanded(!smartExpanded)}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold text-vault-muted uppercase tracking-wider hover:text-vault-text transition-colors"
        >
          <ChevronIcon className="w-3 h-3" open={smartExpanded} />
          Library
        </button>

        {smartExpanded && (
          <div className="space-y-0.5 mb-4">
            {smartCollections.map(collection => (
              <button
                key={collection.id}
                onClick={() => {
                  onSelectCollection(collection.id)
                  onClose?.()
                }}
                className={`
                  flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150
                  ${activeCollectionId === collection.id
                    ? 'bg-accent-sage/15 text-accent-sage font-medium'
                    : 'text-vault-muted hover:text-vault-text hover:bg-vault-bg'
                  }
                `}
              >
                <span className="text-base">{collection.icon}</span>
                <span className="flex-1 text-left truncate">{collection.name}</span>
                <span className={`text-xs tabular-nums ${activeCollectionId === collection.id ? 'text-accent-sage/70' : 'text-vault-muted/50'}`}>
                  {collection.fic_count || 0}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Custom Collections */}
        <button
          onClick={() => setCustomExpanded(!customExpanded)}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold text-vault-muted uppercase tracking-wider hover:text-vault-text transition-colors mt-2"
        >
          <ChevronIcon className="w-3 h-3" open={customExpanded} />
          My Collections
        </button>

        {customExpanded && (
          <div className="space-y-0.5">
            {customCollections.map(collection => (
              <button
                key={collection.id}
                onClick={() => {
                  onSelectCollection(collection.id)
                  onClose?.()
                }}
                className={`
                  flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150
                  ${activeCollectionId === collection.id
                    ? 'bg-accent-sage/15 text-accent-sage font-medium'
                    : 'text-vault-muted hover:text-vault-text hover:bg-vault-bg'
                  }
                `}
              >
                <span className="text-base">{collection.icon}</span>
                <span className="flex-1 text-left truncate">{collection.name}</span>
                <span className={`text-xs tabular-nums ${activeCollectionId === collection.id ? 'text-accent-sage/70' : 'text-vault-muted/50'}`}>
                  {collection.fic_count || 0}
                </span>
              </button>
            ))}

            {customCollections.length === 0 && !showNewForm && (
              <p className="text-xs text-vault-muted/50 px-3 py-2">No custom collections yet.</p>
            )}

            {/* New Collection Form */}
            {showNewForm ? (
              <form onSubmit={handleCreate} className="px-2 py-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={newIcon}
                      onChange={(e) => setNewIcon(e.target.value)}
                      className="vault-input text-base w-12 h-9 text-center p-0 appearance-none cursor-pointer"
                    >
                      {emojiOptions.map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Collection name..."
                    className="vault-input text-sm flex-1 py-1.5"
                    autoFocus
                    maxLength={50}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowNewForm(false); setNewName(''); }}
                    className="text-xs text-vault-muted hover:text-vault-text px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newName.trim()}
                    className="vault-btn-primary text-xs py-1 px-3 disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-vault-muted hover:text-accent-sage hover:bg-vault-bg transition-colors mt-1"
              >
                <PlusIcon className="w-4 h-4" />
                <span>New Collection</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-vault-border bg-vault-card/50 h-[calc(100vh-65px)] sticky top-[65px]">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar (slide-in drawer) */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={onClose} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-vault-card z-50 lg:hidden shadow-vault-lg animate-slide-in">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}

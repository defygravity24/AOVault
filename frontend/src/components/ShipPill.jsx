export default function ShipPill({ ship, onClick, size = 'md', active = false }) {
  if (!ship) return null

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }

  return (
    <button
      onClick={onClick ? () => onClick(ship) : undefined}
      className={`
        inline-flex items-center rounded-full font-medium transition-all duration-200
        ${sizes[size]}
        ${active
          ? 'bg-accent-sage/40 text-accent-sage border-2 border-accent-sage shadow-sm shadow-accent-sage/20'
          : 'bg-accent-sage/15 text-accent-sage border border-accent-sage/30 hover:bg-accent-sage/25 hover:border-accent-sage/50'
        }
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <span className="mr-1.5 opacity-70">⚓</span>
      {ship}
    </button>
  )
}

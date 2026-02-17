export default function FicCardSkeleton() {
  return (
    <div className="vault-card animate-pulse">
      {/* Title + Rating */}
      <div className="flex items-start justify-between mb-2">
        <div className="h-6 bg-vault-border rounded w-3/4" />
        <div className="h-5 w-5 bg-vault-border rounded ml-2" />
      </div>

      {/* Author */}
      <div className="h-4 bg-vault-border rounded w-1/3 mb-3" />

      {/* Ship pill */}
      <div className="flex gap-2 mb-3">
        <div className="h-6 bg-accent-sage/10 rounded-full w-24" />
        <div className="h-6 bg-vault-border rounded-full w-20" />
      </div>

      {/* Summary lines */}
      <div className="space-y-2 mb-4">
        <div className="h-3.5 bg-vault-border rounded w-full" />
        <div className="h-3.5 bg-vault-border rounded w-full" />
        <div className="h-3.5 bg-vault-border rounded w-2/3" />
      </div>

      {/* Tags */}
      <div className="flex gap-1.5 mb-4">
        <div className="h-5 bg-vault-bg rounded w-16" />
        <div className="h-5 bg-vault-bg rounded w-20" />
        <div className="h-5 bg-vault-bg rounded w-14" />
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between border-t border-vault-border pt-3">
        <div className="flex gap-3">
          <div className="h-3.5 bg-vault-border rounded w-16" />
          <div className="h-3.5 bg-vault-border rounded w-12" />
        </div>
        <div className="h-3.5 bg-vault-border rounded w-16" />
      </div>
    </div>
  )
}

'use client'

interface SearchBarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  favoritesOnly: boolean
  onFavoritesToggle: () => void
  favoritesCount: number
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  favoritesOnly,
  onFavoritesToggle,
  favoritesCount,
}: SearchBarProps) {
  return (
    <div className="sticky top-0 z-10 flex gap-2 bg-[#FAF7F2] py-3">
      <input
        type="text"
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Rechercher une recette ou une cuisine…"
        className="flex-1 rounded-xl border border-[#e8e0d5] bg-white px-4 py-2 text-sm text-[var(--color-text)] placeholder:text-[#a89880] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      />
      <button
        type="button"
        onClick={onFavoritesToggle}
        className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
          favoritesOnly
            ? 'bg-[var(--color-primary)] text-white'
            : 'border border-[#e8e0d5] bg-white text-[var(--color-text)] hover:border-[var(--color-primary)]'
        }`}
      >
        ★ Favoris
        {favoritesCount > 0 && (
          <span className={`rounded-full px-1.5 py-0.5 text-xs ${favoritesOnly ? 'bg-white/20' : 'bg-[var(--color-background,#FAF7F2)]'}`}>
            {favoritesCount}
          </span>
        )}
      </button>
    </div>
  )
}

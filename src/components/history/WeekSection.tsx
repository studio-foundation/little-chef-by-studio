'use client'

import { useState } from 'react'
import type { WeekWithRecipes } from './types'
import { toggleFavorite } from './actions'

interface WeekSectionProps {
  week: WeekWithRecipes
  isOpen: boolean
  onToggle: () => void
  weekLabel: string
}

export function WeekSection({ week, isOpen, onToggle, weekLabel }: WeekSectionProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const favoriteCount = week.recipes.filter(r => r.isFavorite).length

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8e0d5] bg-white">
      {/* Header accordéon */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[#faf5ef] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]"
      >
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--color-text)]">
            {weekLabel}
          </span>
          {favoriteCount > 0 && (
            <span className="text-sm text-[var(--color-primary)]">
              ★ {favoriteCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Emoji chips — desktop: 5, mobile: 3 + "+N" */}
          <div className="hidden items-center gap-1 sm:flex">
            {week.recipes.slice(0, 5).map((r) => (
              <span
                key={r.id}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF7F2] text-lg"
              >
                {r.emoji ?? '🍽️'}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1 sm:hidden">
            {week.recipes.slice(0, 3).map((r) => (
              <span
                key={r.id}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF7F2] text-lg"
              >
                {r.emoji ?? '🍽️'}
              </span>
            ))}
            {week.recipes.length > 3 && (
              <span className="text-xs text-[#a89880]">
                +{week.recipes.length - 3}
              </span>
            )}
          </div>

          {/* Chevron animé */}
          <span
            className="text-[#a89880] transition-transform duration-200"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}
          >
            ▾
          </span>
        </div>
      </button>

      {/* Détail (accordéon ouvert) */}
      {isOpen && (
        <div className="animate-[fadeSlideUp_0.2s_ease] border-t border-[#e8e0d5] px-5 py-3">
          <ul className="divide-y divide-[#f0e8df]">
            {week.recipes.map(recipe => (
              <li key={recipe.id} className="flex items-center gap-3 py-3">
                <span className="text-2xl shrink-0">{recipe.emoji ?? '🍽️'}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-[family-name:var(--font-playfair)] font-semibold text-[var(--color-text)] truncate">
                    {recipe.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {recipe.cuisine && (
                      <span className="rounded-full bg-[#FAF7F2] px-2 py-0.5 text-xs text-[var(--color-text)]">
                        {recipe.cuisine}
                      </span>
                    )}
                    {recipe.timeMinutes != null && (
                      <span className="text-xs text-[#a89880]">
                        {recipe.timeMinutes} min
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setPendingId(recipe.id)
                    await toggleFavorite(recipe.id)
                    setPendingId(null)
                  }}
                  disabled={pendingId === recipe.id}
                  className={`shrink-0 text-xl transition-opacity ${pendingId === recipe.id ? 'opacity-40' : 'opacity-100'} ${
                    recipe.isFavorite ? 'text-[var(--color-primary)]' : 'text-[#d4c8bc]'
                  }`}
                  aria-label={recipe.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  ★
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

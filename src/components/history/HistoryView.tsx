'use client'

import { useState, useMemo } from 'react'
import type { WeekWithRecipes } from './types'
import { getWeekLabel, filterWeeks } from './utils'
import { SearchBar } from './SearchBar'
import { WeekSection } from './WeekSection'

interface HistoryViewProps {
  weeks: WeekWithRecipes[]
}

export function HistoryView({ weeks }: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(
    () => new Set(weeks.length > 0 ? [weeks[0].id] : []),
  )

  const filteredWeeks = useMemo(
    () => filterWeeks(weeks, searchQuery, favoritesOnly),
    [weeks, searchQuery, favoritesOnly],
  )

  const isFilterActive = searchQuery.trim().length > 0 || favoritesOnly

  const favoritesCount = useMemo(
    () => weeks.flatMap(w => w.recipes).filter(r => r.isFavorite).length,
    [weeks],
  )

  function toggleWeek(id: string) {
    setOpenWeeks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function isWeekOpen(week: WeekWithRecipes): boolean {
    if (isFilterActive) return true
    return openWeeks.has(week.id)
  }

  if (weeks.length === 0) {
    return (
      <div className="mt-16 text-center">
        <p className="text-[#a89880]">Aucune semaine générée pour l'instant.</p>
        <a
          href="/generate"
          className="mt-4 inline-block rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          Générer mes repas
        </a>
      </div>
    )
  }

  return (
    <div>
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        favoritesOnly={favoritesOnly}
        onFavoritesToggle={() => setFavoritesOnly(v => !v)}
        favoritesCount={favoritesCount}
      />
      <div className="mt-2 flex flex-col gap-3">
        {filteredWeeks.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#a89880]">
            Aucune recette ne correspond à ta recherche.
          </p>
        ) : (
          filteredWeeks.map(week => (
            <WeekSection
              key={week.id}
              week={week}
              isOpen={isWeekOpen(week)}
              onToggle={() => toggleWeek(week.id)}
              weekLabel={getWeekLabel(week.weekStart)}
            />
          ))
        )}
      </div>
    </div>
  )
}

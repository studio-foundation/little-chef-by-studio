import type { WeekWithRecipes } from './types'

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day // ramener au lundi
  d.setDate(d.getDate() + diff)
  return d
}

export function getWeekLabel(weekStart: Date): string {
  const now = getWeekStart(new Date())
  const prev = new Date(now)
  prev.setDate(prev.getDate() - 7)
  const ws = getWeekStart(weekStart)
  if (ws.getTime() === now.getTime()) return 'Cette semaine'
  if (ws.getTime() === prev.getTime()) return 'Semaine passée'
  return `Semaine du ${ws.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
}

export function filterWeeks(
  weeks: WeekWithRecipes[],
  searchQuery: string,
  favoritesOnly: boolean,
): WeekWithRecipes[] {
  const q = searchQuery.toLowerCase().trim()
  if (!q && !favoritesOnly) return weeks
  return weeks
    .map(week => ({
      ...week,
      recipes: week.recipes.filter(r => {
        const matchesSearch =
          !q ||
          r.title.toLowerCase().includes(q) ||
          (r.cuisine?.toLowerCase().includes(q) ?? false)
        const matchesFavorites = !favoritesOnly || r.isFavorite
        return matchesSearch && matchesFavorites
      }),
    }))
    .filter(week => week.recipes.length > 0)
}

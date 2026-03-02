import assert from 'node:assert'
import { getWeekLabel, filterWeeks } from '../utils'
import type { WeekWithRecipes } from '../types'

// --- Helpers ---
function getThisMonday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

// --- getWeekLabel ---
const thisMonday = getThisMonday()
const lastMonday = new Date(thisMonday)
lastMonday.setDate(lastMonday.getDate() - 7)
const oldMonday = new Date('2025-01-06') // un lundi connu

assert.strictEqual(getWeekLabel(thisMonday), 'Cette semaine', 'semaine courante')
assert.strictEqual(getWeekLabel(lastMonday), 'Semaine passée', 'semaine précédente')
assert.ok(getWeekLabel(oldMonday).startsWith('Semaine du'), `ancienne date: ${getWeekLabel(oldMonday)}`)

// --- filterWeeks ---
const weeks: WeekWithRecipes[] = [
  {
    id: 'w1',
    weekStart: thisMonday,
    recipes: [
      { id: 'r1', title: 'Ramen Tonkotsu', cuisine: 'japonaise', timeMinutes: 30, emoji: '🍜', isFavorite: true },
      { id: 'r2', title: 'Curry de pois chiches', cuisine: 'indienne', timeMinutes: 25, emoji: '🍛', isFavorite: false },
    ],
  },
  {
    id: 'w2',
    weekStart: lastMonday,
    recipes: [
      { id: 'r3', title: 'Pâtes primavera', cuisine: 'italienne', timeMinutes: 20, emoji: '🍝', isFavorite: false },
    ],
  },
]

// Pas de filtre → tout retourner
assert.strictEqual(filterWeeks(weeks, '', false).length, 2, 'pas de filtre: 2 semaines')

// Recherche par titre
const byTitle = filterWeeks(weeks, 'ramen', false)
assert.strictEqual(byTitle.length, 1, 'recherche titre: 1 semaine')
assert.strictEqual(byTitle[0].recipes.length, 1, 'recherche titre: 1 recette')
assert.strictEqual(byTitle[0].recipes[0].title, 'Ramen Tonkotsu')

// Recherche par cuisine
const byCuisine = filterWeeks(weeks, 'italienne', false)
assert.strictEqual(byCuisine.length, 1, 'recherche cuisine: 1 semaine')
assert.strictEqual(byCuisine[0].recipes[0].cuisine, 'italienne')

// Recherche insensible à la casse
const caseSensitive = filterWeeks(weeks, 'RAMEN', false)
assert.strictEqual(caseSensitive.length, 1, 'recherche casse: ok')

// Favoris uniquement
const favsOnly = filterWeeks(weeks, '', true)
assert.strictEqual(favsOnly.length, 1, 'favoris: 1 semaine')
assert.strictEqual(favsOnly[0].recipes[0].title, 'Ramen Tonkotsu')

// Combinaison recherche + favoris (aucun résultat)
const combined = filterWeeks(weeks, 'pâtes', true)
assert.strictEqual(combined.length, 0, 'combiné sans match: 0 semaines')

// Semaine sans recettes matching → exclue
const noMatch = filterWeeks(weeks, 'inexistant', false)
assert.strictEqual(noMatch.length, 0, 'aucun match: 0 semaines')

console.log('✅ Tous les tests utils passent')

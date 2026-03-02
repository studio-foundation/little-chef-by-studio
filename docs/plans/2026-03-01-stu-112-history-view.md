# STU-112 — Vue historique des semaines : Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implémenter la route `/history` — accordéon chronologique des semaines avec recherche et filtre favoris, données depuis Prisma.

**Architecture:** Server component charge `WeeklyPlan[]` + recettes via Prisma et passe à un composant client racine. L'état interactif (accordéon, recherche, favoris) vit entièrement côté client. Le toggle favori est une server action avec `revalidatePath`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma, Tailwind v4, pnpm, tsx (test runner)

**Design doc:** `docs/plans/2026-03-01-stu-112-history-view-design.md`

---

## Task 1: Créer le worktree

> Règle CLAUDE.md : tout ticket Linear commence par un worktree.

**Step 1: Créer le worktree depuis la racine du repo**

```bash
git worktree add .worktrees/stu-112-history -b feat/stu-112-history-view
```

**Step 2: Vérifier que le worktree est créé**

```bash
git worktree list
```
Expected: voir `.worktrees/stu-112-history` dans la liste.

**Step 3: Ouvrir le worktree dans le terminal**

```bash
cd .worktrees/stu-112-history
```

> Toutes les étapes suivantes s'exécutent depuis `.worktrees/stu-112-history/`.

---

## Task 2: Prisma schema — ajouter `isFavorite` sur `Recipe`

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Ajouter le champ au modèle Recipe**

Dans `prisma/schema.prisma`, trouver le modèle `Recipe` et ajouter après le champ `timeMinutes` :

```prisma
model Recipe {
  id                String             @id @default(cuid())
  title             String
  createdAt         DateTime           @default(now())
  calories          Int?
  cuisine           String?
  emoji             String?
  ingredients       Json
  isFavorite        Boolean            @default(false)
  notes             Json?
  portions          Int?
  steps             Json
  timeMinutes       Int?
  userId            String
  user              User               @relation(fields: [userId], references: [id])
  WeeklyPlanRecipes WeeklyPlanRecipe[]
}
```

**Step 2: Créer et appliquer la migration**

```bash
pnpm prisma migrate dev --name add-recipe-is-favorite
```
Expected: `The following migration(s) have been applied: .../add-recipe-is-favorite`

**Step 3: Vérifier que le client Prisma est regeneré**

```bash
pnpm prisma generate
```

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add isFavorite field to Recipe model"
```

---

## Task 3: Types + fonctions utilitaires + tests

**Files:**
- Create: `src/components/history/types.ts`
- Create: `src/components/history/utils.ts`
- Create: `src/components/history/__tests__/utils.test.ts`

**Step 1: Créer le fichier de types**

`src/components/history/types.ts` :

```typescript
export type RecipeInWeek = {
  id: string
  title: string
  cuisine: string | null
  timeMinutes: number | null
  emoji: string | null
  isFavorite: boolean
}

export type WeekWithRecipes = {
  id: string
  weekStart: Date
  recipes: RecipeInWeek[]
}
```

**Step 2: Créer les fonctions utilitaires**

`src/components/history/utils.ts` :

```typescript
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
```

**Step 3: Écrire les tests**

Créer le dossier `src/components/history/__tests__/` puis le fichier `utils.test.ts` :

```typescript
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
```

**Step 4: Lancer les tests**

```bash
pnpm tsx src/components/history/__tests__/utils.test.ts
```
Expected: `✅ Tous les tests utils passent`

**Step 5: Commit**

```bash
git add src/components/history/types.ts src/components/history/utils.ts src/components/history/__tests__/utils.test.ts
git commit -m "feat(history): add types and utility functions with tests"
```

---

## Task 4: Server Action — `toggleFavorite`

**Files:**
- Create: `src/components/history/actions.ts`

**Step 1: Créer le fichier**

`src/components/history/actions.ts` :

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/src/lib/prisma'

export async function toggleFavorite(recipeId: string): Promise<void> {
  const recipe = await prisma.recipe.findUniqueOrThrow({
    where: { id: recipeId },
    select: { isFavorite: true },
  })
  await prisma.recipe.update({
    where: { id: recipeId },
    data: { isFavorite: !recipe.isFavorite },
  })
  revalidatePath('/history')
}
```

**Step 2: Vérifier la compilation TypeScript**

```bash
pnpm tsc --noEmit
```
Expected: aucune erreur.

**Step 3: Commit**

```bash
git add src/components/history/actions.ts
git commit -m "feat(history): add toggleFavorite server action"
```

---

## Task 5: Composant `SearchBar`

**Files:**
- Create: `src/components/history/SearchBar.tsx`

**Step 1: Créer le composant**

`src/components/history/SearchBar.tsx` :

```tsx
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
```

**Step 2: Vérifier la compilation TypeScript**

```bash
pnpm tsc --noEmit
```
Expected: aucune erreur.

**Step 3: Commit**

```bash
git add src/components/history/SearchBar.tsx
git commit -m "feat(history): add SearchBar component"
```

---

## Task 6: Composant `WeekSection`

**Files:**
- Create: `src/components/history/WeekSection.tsx`

**Step 1: Créer le composant**

`src/components/history/WeekSection.tsx` :

```tsx
'use client'

import { useTransition } from 'react'
import type { WeekWithRecipes } from './types'
import { toggleFavorite } from './actions'

interface WeekSectionProps {
  week: WeekWithRecipes
  isOpen: boolean
  onToggle: () => void
  weekLabel: string
}

export function WeekSection({ week, isOpen, onToggle, weekLabel }: WeekSectionProps) {
  const [isPending, startTransition] = useTransition()
  const favoriteCount = week.recipes.filter(r => r.isFavorite).length

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8e0d5] bg-white">
      {/* Header accordéon */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[#faf5ef] transition-colors"
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
            {week.recipes.slice(0, 5).map((r, i) => (
              <span
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF7F2] text-lg"
              >
                {r.emoji ?? '🍽️'}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1 sm:hidden">
            {week.recipes.slice(0, 3).map((r, i) => (
              <span
                key={i}
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
                  onClick={() => startTransition(() => toggleFavorite(recipe.id))}
                  disabled={isPending}
                  className={`shrink-0 text-xl transition-opacity ${isPending ? 'opacity-40' : 'opacity-100'} ${
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
```

**Step 2: Vérifier la compilation TypeScript**

```bash
pnpm tsc --noEmit
```
Expected: aucune erreur.

**Step 3: Commit**

```bash
git add src/components/history/WeekSection.tsx
git commit -m "feat(history): add WeekSection accordion component"
```

---

## Task 7: Composant `HistoryView`

**Files:**
- Create: `src/components/history/HistoryView.tsx`

**Step 1: Créer le composant racine client**

`src/components/history/HistoryView.tsx` :

```tsx
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
```

**Step 2: Vérifier la compilation TypeScript**

```bash
pnpm tsc --noEmit
```
Expected: aucune erreur.

**Step 3: Commit**

```bash
git add src/components/history/HistoryView.tsx
git commit -m "feat(history): add HistoryView client root component"
```

---

## Task 8: Page serveur `/history`

**Files:**
- Modify: `app/(app)/history/page.tsx`

**Step 1: Remplacer le stub par la vraie implémentation**

`app/(app)/history/page.tsx` :

```tsx
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/src/lib/prisma'
import { HistoryView } from '@/src/components/history/HistoryView'
import type { WeekWithRecipes } from '@/src/components/history/types'

export default async function HistoryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const weeklyPlans = await prisma.weeklyPlan.findMany({
    where: { userId: session.user.id },
    orderBy: { weekStart: 'desc' },
    include: {
      recipes: {
        include: { recipe: true },
        orderBy: { position: 'asc' },
      },
    },
  })

  const weeks: WeekWithRecipes[] = weeklyPlans.map(plan => ({
    id: plan.id,
    weekStart: plan.weekStart,
    recipes: plan.recipes.map(wpr => ({
      id: wpr.recipe.id,
      title: wpr.recipe.title,
      cuisine: wpr.recipe.cuisine,
      timeMinutes: wpr.recipe.timeMinutes,
      emoji: wpr.recipe.emoji,
      isFavorite: wpr.recipe.isFavorite,
    })),
  }))

  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--color-text)]">
        Historique
      </h1>
      <p className="mb-6 mt-1 text-sm text-[#a89880]">
        {weeks.length} semaine{weeks.length !== 1 ? 's' : ''} générée{weeks.length !== 1 ? 's' : ''}
      </p>
      <HistoryView weeks={weeks} />
    </div>
  )
}
```

**Step 2: Vérifier la compilation TypeScript**

```bash
pnpm tsc --noEmit
```
Expected: aucune erreur.

**Step 3: Commit**

```bash
git add app/(app)/history/page.tsx
git commit -m "feat(history): implement /history server component with Prisma data"
```

---

## Task 9: Build + vérification finale

**Step 1: Lancer les tests utils une dernière fois**

```bash
pnpm tsx src/components/history/__tests__/utils.test.ts
```
Expected: `✅ Tous les tests utils passent`

**Step 2: Lancer le build production**

```bash
pnpm build
```
Expected: `✓ Compiled successfully` — aucune erreur TypeScript, aucune erreur de build.

**Step 3: Commit si ajustements nécessaires**

Si le build révèle des erreurs TypeScript ou de lint, les corriger et committer :
```bash
git add -p
git commit -m "fix(history): address build errors"
```

---

## Task 10: Créer la PR

**Step 1: Push la branche**

```bash
git push -u origin feat/stu-112-history-view
```

**Step 2: Créer la PR**

```bash
gh pr create \
  --title "feat(history): STU-112 — Vue historique des semaines" \
  --body "$(cat <<'EOF'
## Summary

- Implémente `/history` : accordéon chronologique des semaines avec recherche et filtre favoris
- Ajoute `isFavorite: Boolean` sur le modèle `Recipe` (migration Prisma incluse)
- Server action `toggleFavorite` avec revalidation

## Composants ajoutés

- `src/components/history/types.ts` — types partagés
- `src/components/history/utils.ts` — `getWeekLabel`, `filterWeeks` (testés)
- `src/components/history/actions.ts` — server action toggle favori
- `src/components/history/SearchBar.tsx` — barre sticky
- `src/components/history/WeekSection.tsx` — accordion item
- `src/components/history/HistoryView.tsx` — composant client racine
- `app/(app)/history/page.tsx` — server component remplace le stub

## Test plan

- [ ] `pnpm tsx src/components/history/__tests__/utils.test.ts` passe
- [ ] `pnpm build` sans erreur
- [ ] Naviguer vers `/history` : accordéon s'affiche, semaine courante ouverte
- [ ] Ouvrir/fermer d'autres semaines
- [ ] Rechercher "ramen" → seules les semaines avec match s'affichent, toutes ouvertes
- [ ] Activer filtre Favoris → uniquement les ★
- [ ] Vider la recherche → retour à l'état manuel
- [ ] Cliquer ★ sur une recette → toggle persisté, compteur mis à jour
- [ ] Responsive mobile : 3 emojis + "+N"
- [ ] État vide si aucun résultat de recherche

Closes STU-112

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main
```

---

## Critères d'acceptation vérifiés

- [ ] Liste chronologique, semaines les plus récentes en premier
- [ ] Accordion : ouverture/fermeture par clic, animation fluide
- [ ] Semaine courante ouverte par défaut
- [ ] Mini-preview 5 emojis visible en état fermé
- [ ] Recherche : filtre par nom de recette et cuisine en temps réel
- [ ] Filtre favoris : affiche uniquement les ★, compteur visible sur le bouton
- [ ] Quand recherche ou favoris actifs → accordéons des semaines avec résultats s'ouvrent
- [ ] État vide propre si aucun résultat
- [ ] Données chargées depuis DB (WeeklyPlan + Recipe via Prisma)
- [ ] Responsive mobile
- [ ] `isFavorite` sur `Recipe` avec migration Prisma

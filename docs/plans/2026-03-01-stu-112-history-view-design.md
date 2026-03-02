# STU-112 — Vue historique des semaines : Design

**Date :** 2026-03-01
**Ticket :** [STU-112](https://linear.app/studioag/issue/STU-112/vue-historique-des-semaines)
**Route :** `/history`
**Statut :** Design validé, prêt pour implémentation

---

## Contexte

Permettre à l'utilisateur de retrouver les repas des semaines passées — revoir une recette aimée, éviter les répétitions, consulter l'historique. Vue en accordéon chronologique avec recherche et filtre favoris.

---

## Architecture : Approche A (Server + Client interactif)

Le server component charge toutes les données via Prisma et les passe à un composant client racine qui gère les interactions. Pattern identique à `/recipes`.

```
app/(app)/history/page.tsx      ← Server component (auth + Prisma query)
    └── <HistoryView weeks={...} />

src/components/history/
├── HistoryView.tsx             ← Client root (search, favorites, accordion state)
├── WeekSection.tsx             ← Accordion item (header + collapsible detail)
└── SearchBar.tsx               ← Barre sticky (search input + favorites toggle)
```

---

## Couche données

### Schema Prisma — ajout `isFavorite`

```prisma
model Recipe {
  // ... champs existants ...
  isFavorite  Boolean  @default(false)
}
```

Favori = propriété globale de la recette (pas liée à une semaine), cohérent avec le bouton ♥ dans `/recipes`.

Migration Prisma incluse dans ce ticket.

### Query principale (server component)

```typescript
const weeklyPlans = await prisma.weeklyPlan.findMany({
  where: { userId },
  orderBy: { weekStart: 'desc' },
  include: {
    recipes: {
      include: { recipe: true },
      orderBy: { position: 'asc' },
    },
  },
})
```

### Toggle favori — Server Action

```typescript
// src/components/history/actions.ts
'use server'
async function toggleFavorite(recipeId: string) {
  const recipe = await prisma.recipe.findUniqueOrThrow({ where: { id: recipeId } })
  await prisma.recipe.update({
    where: { id: recipeId },
    data: { isFavorite: !recipe.isFavorite },
  })
  revalidatePath('/history')
}
```

### Types partagés

```typescript
type RecipeInWeek = {
  id: string
  title: string
  cuisine: string | null
  timeMinutes: number | null
  emoji: string | null
  isFavorite: boolean
}

type WeekWithRecipes = {
  id: string
  weekStart: Date
  recipes: RecipeInWeek[]
}
```

---

## Composants

### `page.tsx` — Server component

- Auth check → redirect `/login` si non authentifié
- Prisma query (cf. ci-dessus)
- Transformation `WeeklyPlan[]` → `WeekWithRecipes[]`
- Render `<HistoryView weeks={weeks} />`

### `HistoryView.tsx` — Client root

État local géré :
- `searchQuery: string` — filtre temps réel
- `favoritesOnly: boolean` — filtre ★
- `openWeeks: Set<string>` — semaines ouvertes manuellement

Logique d'affichage :
- Recettes filtrées = recettes dont `title` ou `cuisine` contient `searchQuery` (case-insensitive) ET `isFavorite` si `favoritesOnly`
- Semaine visible = a ≥ 1 recette filtrée
- Semaine auto-ouverte = filtre actif ET semaine a des résultats (override de l'état manuel)
- Semaine ouverte par défaut = première semaine (la plus récente)

### `WeekSection.tsx` — Accordion item

**Header (état fermé) :**
- Label semaine : "Cette semaine" | "Semaine passée" | "Semaine du DD MMM"
- 5 emoji chips colorées (une par recette) — sur mobile : 3 visibles + "+2"
- Compteur favoris "★ N" si N > 0
- Chevron `▾` → rotate 180° CSS à l'ouverture

**Détail (état ouvert) :**
- Animation `fadeSlideUp` (CSS transition, pas de lib)
- Liste des recettes avec : emoji, nom (Playfair), cuisine badge, temps badge, bouton ★
- Bouton ★ déclenche server action `toggleFavorite`

### `SearchBar.tsx` — Barre sticky

- Position sticky sous le header de page
- Input full-width : placeholder "Rechercher une recette ou une cuisine…"
- Bouton "★ Favoris (N)" — N = count global des recettes favorites
- Se combine (AND) avec la recherche

---

## Interactions

### Labels de semaine

```typescript
function getWeekLabel(weekStart: Date): string {
  const now = startOfWeek(new Date(), { weekStartsOn: 1 })
  const start = startOfWeek(weekStart, { weekStartsOn: 1 })
  const diff = differenceInCalendarWeeks(now, start, { weekStartsOn: 1 })
  if (diff === 0) return 'Cette semaine'
  if (diff === 1) return 'Semaine passée'
  return `Semaine du ${format(weekStart, 'd MMM', { locale: fr })}`
}
```

### Accordéon

- Semaine courante ouverte par défaut
- Clic header → toggle dans `openWeeks` Set
- Quand filtre actif → toutes semaines avec résultats forcées ouvertes (indépendant du Set)

### États vides

| Situation | Rendu |
|-----------|-------|
| Aucune semaine en DB | "Aucune semaine générée" + bouton "Générer mes repas" → `/generate` |
| Filtre sans résultat | "Aucune recette ne correspond à ta recherche" |

---

## Design system

Cohérent avec l'existant :
- Fond : `var(--color-background)` (ivoire `#FAF7F2`)
- Titres semaine : Playfair Display, brun foncé
- Emoji chips : petits ronds colorés (style badges `/generate`)
- Badges cuisine/temps : style identique à `RecipesCard.tsx`
- Chevron + accordion : transitions CSS natives (pas de Framer Motion)
- Couleur accent favoris : terra cotta/orange (`var(--color-primary)`)

---

## Critères d'acceptation (depuis le ticket)

- [ ] Liste chronologique, semaines les plus récentes en premier
- [ ] Accordion : ouverture/fermeture par clic, animation fluide
- [ ] Semaine courante ouverte par défaut
- [ ] Mini-preview 5 emojis visible en état fermé
- [ ] Recherche : filtre par nom de recette et cuisine en temps réel
- [ ] Filtre favoris : affiche uniquement les ★, compteur visible sur le bouton
- [ ] Quand recherche ou favoris actifs → accordéons des semaines avec résultats s'ouvrent automatiquement
- [ ] État vide propre si aucun résultat
- [ ] Données chargées depuis DB (WeeklyPlan + Recipe via Prisma)
- [ ] Responsive mobile (emoji chips : 3 + "+N" sur mobile)
- [ ] `isFavorite` sur `Recipe` avec migration Prisma

---

## Dépendances

- **STU-207** : Schema Prisma WeeklyPlan/Recipe — les modèles existent, ce ticket ajoute `isFavorite`
- **STU-208** : Tool db-upsert_recipe — nécessaire pour que les semaines existent en DB

## Hors scope

- Réutilisation directe d'une recette depuis l'historique (future feature)
- Suppression de semaines
- Pagination (toutes les semaines chargées en une fois)

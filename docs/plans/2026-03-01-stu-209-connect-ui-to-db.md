# STU-209 — UI: Connect /generate and /recipes to DB recipes

**Date:** 2026-03-01
**Status:** Approved
**Linear:** https://linear.app/studioag/issue/STU-209

## Problem

`/generate` and `/recipes` pages use hardcoded mock data (`SAMPLE_RECIPES` in `sampleData.ts`). Since STU-208, recipes are persisted in PostgreSQL via Prisma. This design connects the UI to real data.

## Decisions

| Question | Decision |
|---|---|
| Auth for GET /api/recipes | `auth()` NextAuth — 401 if no session |
| How /generate gets recipes after SSE | Fetch `/api/recipes?limit=5` when all slots are `done` |
| /recipes architecture | Server Component (fetch Prisma direct) + RecipesGrid Client Component |
| schema.prisma fix | Yes — correct in this ticket (no new migration needed) |

## Files Touched

| File | Change |
|---|---|
| `prisma/schema.prisma` | Sync with migration STU-208 (add structured fields) |
| `src/components/generate/types.ts` | `id?: string` (was `number`) |
| `app/api/recipes/route.ts` | New — GET route, auth, Prisma fetch, DB→Recipe mapping |
| `app/(app)/generate/page.tsx` | Fetch `/api/recipes` when all slots done, display real cards |
| `app/(app)/recipes/page.tsx` | Server Component — auth, Prisma, pass to RecipesGrid |
| `app/(app)/recipes/RecipesGrid.tsx` | New Client Component — modal + regen state (extracted from page) |
| `src/components/recipes/RecipesCard.tsx` | `id: string` key (was `number`) |
| `src/components/recipes/RecipeDetail.tsx` | `onRegenerate(id: string)` (was `number`) |
| `src/components/generate/sampleData.ts` | Remove `SAMPLE_RECIPES`; remove `GENERATION_MESSAGES` if unused |

## Architecture

### GET /api/recipes

```
auth() → 401 if no session
prisma.recipe.findMany({
  where: { userId: session.user.id },
  orderBy: { createdAt: 'desc' },
  take: query.limit ?? 5
})
→ map via dbToRecipe()
→ return Recipe[]
```

### DB → Recipe Mapping

```typescript
function dbToRecipe(r: PrismaRecipe): Recipe {
  const steps = r.steps as Array<{ order: number; title: string; instructions: string[] }>
  const ingredients = r.ingredients as Array<{ name: string; quantity: string }>
  const notes = r.notes as { chef?: string[]; nutrition?: string } | null

  return {
    id: r.id,
    name: r.title,
    time: r.timeMinutes ? `${r.timeMinutes} min` : '—',
    kcal: r.calories ? `${r.calories} kcal` : '—',
    tags: [],
    emoji: r.emoji ?? '🍽️',
    ...cuisineToColors(r.cuisine),
    desc: notes?.chef?.[0] ?? steps[0]?.title ?? '',
    description: notes?.chef?.join(' ') ?? '',
    portions: r.portions ?? undefined,
    ingredients: ingredients.map(i => ({ qty: i.quantity, name: i.name })),
    steps: steps.flatMap(s => s.instructions),
  }
}
```

### Cuisine Color Palette

```typescript
const CUISINE_COLORS: Record<string, { color: string; accent: string }> = {
  japonaise: { color: '#FFF3E0', accent: '#FF9800' },
  italienne:  { color: '#FCE4EC', accent: '#E91E63' },
  indienne:   { color: '#FFF8E1', accent: '#FFC107' },
  mexicaine:  { color: '#FFF8E1', accent: '#FF5722' },
  française:  { color: '#E8F4FD', accent: '#1565C0' },
  default:    { color: '#E8F5E9', accent: '#4CAF50' },
}
```

### /recipes Page Split

```
app/(app)/recipes/
├── page.tsx         ← Server Component: auth() + prisma + pass recipes to RecipesGrid
└── RecipesGrid.tsx  ← Client Component: selected state, regenIds (Set<string>), modal
```

### /generate After Generation

- Add `recipes: Recipe[]` state
- `useEffect` on `pageState === 'success'` → `fetch('/api/recipes?limit=5')`
- Slots with status `done` display `recipes[i]` if available, else empty slot (no crash)
- On fetch error: log, stay in `success` state without cards

## Acceptance Criteria

- [ ] `GET /api/recipes` returns user's DB recipes mapped to `Recipe[]`
- [ ] `/recipes` displays real generated recipes (not mocks)
- [ ] `/generate` shows real recipe cards after generation
- [ ] `Recipe.id` is `string` (cuid)
- [ ] `sampleData.ts` no longer contains hardcoded `SAMPLE_RECIPES`
- [ ] No visual regression (cards look identical)
- [ ] `pnpm build` passes

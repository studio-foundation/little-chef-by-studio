# STU-209 — Connect UI to DB Recipes: Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded `SAMPLE_RECIPES` mock data with real Prisma DB recipes in `/generate` and `/recipes` pages.

**Architecture:** Add `GET /api/recipes` route (auth + Prisma + mapping), convert `/recipes` page to Server Component with extracted `RecipesGrid` client component, update `/generate` to fetch real data after all pipelines complete.

**Tech Stack:** Next.js 16 App Router, Prisma 7, NextAuth 5, TypeScript 5. No test runner — use `pnpm build` for verification.

**Design doc:** `docs/plans/2026-03-01-stu-209-connect-ui-to-db.md`

---

### Task 0: Worktree setup

Per CLAUDE.md — every Linear ticket requires a worktree first.

**Step 1: Create the worktree**

```bash
git worktree add .worktrees/stu-209 -b feat/stu-209-connect-ui-to-db
```

**Step 2: Move to worktree**

```bash
cd .worktrees/stu-209
```

All subsequent work happens inside `.worktrees/stu-209/`.

---

### Task 1: Fix `prisma/schema.prisma`

The migration `20260301143000_stu_208_recipe_schema_v2` updated the DB but `schema.prisma` was not synced. Fix it so Prisma client generation is correct.

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Replace the Recipe model**

The current `Recipe` model in `schema.prisma`:
```prisma
model Recipe {
  id          String       @id @default(cuid())
  planId      String
  title       String
  rawJson     Json
  createdAt   DateTime     @default(now())
  GroceryList GroceryList?
  WeeklyPlan  WeeklyPlan   @relation(fields: [planId], references: [id])
}
```

Replace with (matches migration STU-208):
```prisma
model Recipe {
  id           String             @id @default(cuid())
  userId       String
  title        String
  cuisine      String?
  timeMinutes  Int?
  portions     Int?
  emoji        String?
  calories     Int?
  ingredients  Json
  steps        Json
  notes        Json?
  createdAt    DateTime           @default(now())
  user         User               @relation(fields: [userId], references: [id])
  WeeklyPlanRecipes WeeklyPlanRecipe[]
}
```

**Step 2: Replace the GroceryList model**

Current:
```prisma
model GroceryList {
  id       String @id @default(cuid())
  recipeId String @unique
  items    Json
  Recipe   Recipe @relation(fields: [recipeId], references: [id])
}
```

Replace with (GroceryList now links to WeeklyPlan):
```prisma
model GroceryList {
  id       String     @id @default(cuid())
  planId   String     @unique
  items    Json
  plan     WeeklyPlan @relation(fields: [planId], references: [id])
}
```

**Step 3: Update WeeklyPlan model**

Current:
```prisma
model WeeklyPlan {
  id        String   @id @default(cuid())
  userId    String
  weekStart DateTime
  createdAt DateTime @default(now())
  Recipe    Recipe[]
  user      User     @relation(fields: [userId], references: [id])
}
```

Replace with:
```prisma
model WeeklyPlan {
  id          String             @id @default(cuid())
  userId      String
  weekStart   DateTime
  createdAt   DateTime           @default(now())
  user        User               @relation(fields: [userId], references: [id])
  recipes     WeeklyPlanRecipe[]
  GroceryList GroceryList?
}
```

**Step 4: Add WeeklyPlanRecipe model** (after WeeklyPlan)

```prisma
model WeeklyPlanRecipe {
  id        String     @id @default(cuid())
  planId    String
  recipeId  String
  position  Int
  addedAt   DateTime   @default(now())
  plan      WeeklyPlan @relation(fields: [planId], references: [id])
  recipe    Recipe     @relation(fields: [recipeId], references: [id])

  @@unique([planId, recipeId])
  @@unique([planId, position])
}
```

**Step 5: Update User model** to remove direct `Recipe` relation (now via WeeklyPlanRecipe) and add recipes direct relation

The User model currently has `plans WeeklyPlan[]`. Add direct `recipes Recipe[]`:
```prisma
model User {
  id            String       @id @default(cuid())
  name          String?
  email         String       @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime     @default(now())
  accounts      Account[]
  sessions      Session[]
  plans         WeeklyPlan[]
  recipes       Recipe[]
}
```

**Step 6: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` — no errors.

**Step 7: Verify TypeScript compilation**

```bash
pnpm build
```

Expected: Build may fail on other issues (we haven't fixed types yet) — that's ok. The goal here is no Prisma schema errors.

**Step 8: Commit**

```bash
git add prisma/schema.prisma
git commit -m "fix(db): sync schema.prisma with migration STU-208"
```

---

### Task 2: Update `Recipe` type — `id?: string`

**Files:**
- Modify: `src/components/generate/types.ts`

**Step 1: Change id field type**

Current line 11: `id?: number;`
Change to: `id?: string;`

Full updated file:
```typescript
export interface Recipe {
  name: string;
  time: string;
  kcal: string;
  tags: string[];
  emoji: string;
  color: string;   // light background color, e.g. "#FFF3E0"
  accent: string;  // vivid accent color, e.g. "#FF9800"
  desc: string;
  // Extended fields for /recipes page
  id?: string;
  description?: string;
  portions?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
  ingredients?: { qty: string; name: string }[];
  steps?: string[];
}
```

**Step 2: Commit**

```bash
git add src/components/generate/types.ts
git commit -m "feat(types): Recipe.id is now string (cuid)"
```

---

### Task 3: Create `GET /api/recipes` route

**Files:**
- Create: `app/api/recipes/route.ts`

**Step 1: Write the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/src/lib/prisma';
import type { Recipe } from '@/src/components/generate/types';

const CUISINE_COLORS: Record<string, { color: string; accent: string }> = {
  japonaise:   { color: '#FFF3E0', accent: '#FF9800' },
  italienne:   { color: '#FCE4EC', accent: '#E91E63' },
  indienne:    { color: '#FFF8E1', accent: '#FFC107' },
  mexicaine:   { color: '#FFF8E1', accent: '#FF5722' },
  française:   { color: '#E8F4FD', accent: '#1565C0' },
  asiatique:   { color: '#F3E5F5', accent: '#9C27B0' },
  américaine:  { color: '#FBE9E7', accent: '#FF5722' },
  default:     { color: '#E8F5E9', accent: '#4CAF50' },
};

function cuisineToColors(cuisine: string | null): { color: string; accent: string } {
  if (!cuisine) return CUISINE_COLORS.default;
  const key = cuisine.toLowerCase();
  return CUISINE_COLORS[key] ?? CUISINE_COLORS.default;
}

type DbStep = { order: number; title: string; instructions: string[] };
type DbIngredient = { name: string; quantity: string };
type DbNotes = { chef?: string[]; nutrition?: string } | null;

function dbToRecipe(r: {
  id: string;
  title: string;
  cuisine: string | null;
  timeMinutes: number | null;
  calories: number | null;
  portions: number | null;
  emoji: string | null;
  ingredients: unknown;
  steps: unknown;
  notes: unknown;
}): Recipe {
  const steps = (r.steps as DbStep[]) ?? [];
  const ingredients = (r.ingredients as DbIngredient[]) ?? [];
  const notes = r.notes as DbNotes;

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
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '5');

  try {
    const dbRecipes = await prisma.recipe.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const recipes: Recipe[] = dbRecipes.map(dbToRecipe);
    return NextResponse.json(recipes);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DB error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Verify build**

```bash
pnpm build
```

Expected: Passes (or only pre-existing errors). Fix any TypeScript errors from the new file before continuing.

**Step 3: Commit**

```bash
git add app/api/recipes/route.ts
git commit -m "feat(api): GET /api/recipes — auth + Prisma + DB→Recipe mapping"
```

---

### Task 4: Extract `RecipesGrid` client component

The current `/recipes/page.tsx` is `"use client"` and manages all state. Extract the interactive parts into a new `RecipesGrid` client component so the page can become a Server Component.

**Files:**
- Create: `app/(app)/recipes/RecipesGrid.tsx`

**Step 1: Write the new client component**

`RecipesGrid` receives `recipes: Recipe[]` as a prop and manages `selected` and `regenIds` state:

```typescript
"use client";

import { useState } from "react";
import type { Recipe } from "@/src/components/generate/types";
import { RecipesCard } from "@/src/components/recipes/RecipesCard";
import { RecipeDetail } from "@/src/components/recipes/RecipeDetail";
import { Button } from "@/src/components/ui";
import { useRouter } from "next/navigation";

interface RecipesGridProps {
  recipes: Recipe[];
}

export function RecipesGrid({ recipes }: RecipesGridProps) {
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [regenIds, setRegenIds] = useState<Set<string>>(new Set());

  const router = useRouter();

  const handleRegenerate = (id: string) => {
    setRegenIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setRegenIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2500);
  };

  return (
    <>
      {/* En-tête */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-text)]">
            Mes recettes
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {recipes.length} recettes · Cliquer sur une recette pour les détails
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => router.push("/grocery-list")}>
          📋 Liste d&apos;épicerie
        </Button>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[18px]">
        {recipes.map((recipe) => (
          <div key={recipe.id ?? recipe.name} className="relative">
            {recipe.id !== undefined && regenIds.has(recipe.id) && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl text-[13px] font-semibold text-[var(--color-primary)]"
                style={{
                  background: "rgba(250,248,245,0.85)",
                  backdropFilter: "blur(2px)",
                }}
              >
                <span className="inline-block animate-[spin_1s_linear_infinite] text-2xl">
                  ⟳
                </span>
                Génération…
              </div>
            )}
            <RecipesCard recipe={recipe} onOpen={setSelected} />
          </div>
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <RecipeDetail
          recipe={selected}
          onClose={() => setSelected(null)}
          onRegenerate={handleRegenerate}
        />
      )}
    </>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(app\)/recipes/RecipesGrid.tsx
git commit -m "feat(recipes): extract RecipesGrid client component"
```

---

### Task 5: Update `RecipeDetail` — `onRegenerate: (id: string) => void`

**Files:**
- Modify: `src/components/recipes/RecipeDetail.tsx`

**Step 1: Change the prop type**

Line 10 — change:
```typescript
  onRegenerate: (id: number) => void;
```
to:
```typescript
  onRegenerate: (id: string) => void;
```

No other changes needed — `recipe.id` is now `string | undefined`, and `handleRegen` calls `onRegenerate(recipe.id)` which now accepts `string`.

**Step 2: Commit**

```bash
git add src/components/recipes/RecipeDetail.tsx
git commit -m "fix(recipes): RecipeDetail.onRegenerate accepts string id"
```

---

### Task 6: Convert `/recipes/page.tsx` to Server Component

**Files:**
- Modify: `app/(app)/recipes/page.tsx`

**Step 1: Rewrite the page**

Replace the entire file content:

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import { RecipesGrid } from "./RecipesGrid";
import type { Recipe } from "@/src/components/generate/types";

type DbStep = { order: number; title: string; instructions: string[] };
type DbIngredient = { name: string; quantity: string };
type DbNotes = { chef?: string[]; nutrition?: string } | null;

const CUISINE_COLORS: Record<string, { color: string; accent: string }> = {
  japonaise:   { color: '#FFF3E0', accent: '#FF9800' },
  italienne:   { color: '#FCE4EC', accent: '#E91E63' },
  indienne:    { color: '#FFF8E1', accent: '#FFC107' },
  mexicaine:   { color: '#FFF8E1', accent: '#FF5722' },
  française:   { color: '#E8F4FD', accent: '#1565C0' },
  asiatique:   { color: '#F3E5F5', accent: '#9C27B0' },
  américaine:  { color: '#FBE9E7', accent: '#FF5722' },
  default:     { color: '#E8F5E9', accent: '#4CAF50' },
};

function cuisineToColors(cuisine: string | null): { color: string; accent: string } {
  if (!cuisine) return CUISINE_COLORS.default;
  return CUISINE_COLORS[cuisine.toLowerCase()] ?? CUISINE_COLORS.default;
}

function dbToRecipe(r: {
  id: string;
  title: string;
  cuisine: string | null;
  timeMinutes: number | null;
  calories: number | null;
  portions: number | null;
  emoji: string | null;
  ingredients: unknown;
  steps: unknown;
  notes: unknown;
}): Recipe {
  const steps = (r.steps as DbStep[]) ?? [];
  const ingredients = (r.ingredients as DbIngredient[]) ?? [];
  const notes = r.notes as DbNotes;

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
  };
}

export default async function RecipesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const dbRecipes = await prisma.recipe.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const recipes: Recipe[] = dbRecipes.map(dbToRecipe);

  return <RecipesGrid recipes={recipes} />;
}
```

> **Note on duplication:** `dbToRecipe` and `CUISINE_COLORS` are duplicated between this file and `app/api/recipes/route.ts`. A follow-up refactor can extract them to `src/lib/recipes/mapper.ts`. For now, YAGNI — keep it simple.

**Step 2: Verify build**

```bash
pnpm build
```

Expected: Passes. Fix any TypeScript errors.

**Step 3: Commit**

```bash
git add app/\(app\)/recipes/page.tsx
git commit -m "feat(recipes): convert page to Server Component, fetch from Prisma"
```

---

### Task 7: Update `/generate/page.tsx` — fetch real recipes after generation

**Files:**
- Modify: `app/(app)/generate/page.tsx`

**Step 1: Add `recipes` state and fetch logic**

Make these changes to `generate/page.tsx`:

1. Remove the `SAMPLE_RECIPES` import (line 7):
   ```typescript
   // DELETE: import { SAMPLE_RECIPES } from "@/src/components/generate/sampleData";
   ```

2. Add `Recipe` type import:
   ```typescript
   import type { Recipe } from "@/src/components/generate/types";
   ```

3. Add `recipes` state after `sourcesRef`:
   ```typescript
   const [recipes, setRecipes] = useState<Recipe[]>([]);
   ```

4. Add a `useEffect` that fires when `pageState` becomes `'success'`:
   ```typescript
   useEffect(() => {
     if (pageState !== 'success') return;
     fetch('/api/recipes?limit=5')
       .then(res => res.ok ? res.json() as Promise<Recipe[]> : Promise.resolve([]))
       .then(setRecipes)
       .catch(() => { /* non-critical — stay in success state */ });
   }, [pageState]);
   ```

5. Update the `reset` function to clear recipes:
   ```typescript
   const reset = () => {
     sourcesRef.current.forEach(es => es.close());
     sourcesRef.current = [];
     setRecipes([]);
     void startGeneration();
   };
   ```

   Also add `setRecipes([])` inside `startGeneration()` at the top:
   ```typescript
   const startGeneration = async () => {
     setPageState('generating');
     setRecipes([]);
     setSlots(Array.from({ length: TOTAL }, () => ({ status: 'idle' as SlotStatus })));
     // ...rest unchanged
   ```

6. Update the `done` slot rendering (around line 194–199) — replace `SAMPLE_RECIPES[i]` with `recipes[i]`:
   ```typescript
   if (slot.status === 'done') {
     const recipe = recipes[i];
     if (!recipe) {
       return (
         <div
           key={i}
           className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-[var(--color-border)] bg-white"
         >
           <span className="text-[28px] opacity-40">✓</span>
           <span className="text-[13px] text-[var(--color-text-muted)]">
             Recette {i + 1} prête
           </span>
         </div>
       );
     }
     return <RecipeCard key={i} recipe={recipe} visible />;
   }
   ```

**Step 2: Verify build**

```bash
pnpm build
```

Expected: Passes. Fix any TypeScript errors.

**Step 3: Commit**

```bash
git add app/\(app\)/generate/page.tsx
git commit -m "feat(generate): fetch real recipes from DB after generation"
```

---

### Task 8: Clean up `sampleData.ts`

**Files:**
- Modify: `src/components/generate/sampleData.ts`

**Step 1: Check if GENERATION_MESSAGES is used anywhere**

```bash
grep -r "GENERATION_MESSAGES" src/ app/ --include="*.ts" --include="*.tsx"
```

**Step 2a: If GENERATION_MESSAGES is not used**

Delete the entire file:
```bash
git rm src/components/generate/sampleData.ts
```

**Step 2b: If GENERATION_MESSAGES is used**

Remove only `SAMPLE_RECIPES`, keep `GENERATION_MESSAGES`. Replace entire file content with just:
```typescript
export const GENERATION_MESSAGES = [
  "On analyse tes préférences…",
  "Première recette en préparation…",
  "On équilibre les nutriments…",
  "Troisième recette trouvée…",
  "Presque là…",
  "Dernière touche…",
  "Ta semaine est prête ✨",
];
```

**Step 3: Verify build**

```bash
pnpm build
```

Expected: Passes with no errors.

**Step 4: Commit**

```bash
# If deleted:
git commit -m "chore: remove SAMPLE_RECIPES mock data"

# If kept with GENERATION_MESSAGES only:
git add src/components/generate/sampleData.ts
git commit -m "chore: remove SAMPLE_RECIPES mock data from sampleData.ts"
```

---

### Task 9: Final build verification

**Step 1: Full clean build**

```bash
pnpm build
```

Expected output ends with:
```
✓ Compiled successfully
Route (app)                   Size
...
```

No TypeScript errors. No missing imports. All pages render without crashing.

**Step 2: Smoke-check the routes in dev** (optional but recommended)

```bash
pnpm dev
```

- Visit `http://localhost:3000/recipes` — should show real recipes (or empty state if no DB data)
- Visit `http://localhost:3000/generate` — should show generation flow, then real recipe cards after done

---

### Task 10: Push and open PR

**Step 1: Push branch**

```bash
git push -u origin feat/stu-209-connect-ui-to-db
```

**Step 2: Open PR**

```bash
gh pr create \
  --title "feat(ui): STU-209 — Connect /generate and /recipes to DB recipes" \
  --body "$(cat <<'EOF'
## Summary

- Fixes `prisma/schema.prisma` to match migration STU-208 (structured fields instead of rawJson)
- Adds `GET /api/recipes` route with NextAuth session guard and DB→Recipe mapping
- Converts `/recipes` page to Server Component with `RecipesGrid` client component
- Updates `/generate` to fetch real recipes from DB after all pipelines complete
- Removes hardcoded `SAMPLE_RECIPES` mock data

## Test plan

- [ ] `pnpm build` passes with no errors
- [ ] `/recipes` displays recipes from DB (or empty state if no data)
- [ ] `/generate` → generate → all cards show real recipe data
- [ ] Visiting `/recipes` without auth redirects to `/login`
- [ ] `GET /api/recipes` returns 401 without session
- [ ] No visual regression on recipe cards

Closes STU-209

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main
```

---

## Acceptance Checklist

- [ ] `GET /api/recipes` returns user's DB recipes mapped to `Recipe[]`
- [ ] `/recipes` displays real generated recipes (not mocks)
- [ ] `/generate` shows real recipe cards after generation
- [ ] `Recipe.id` is `string` (cuid)
- [ ] `sampleData.ts` no longer contains hardcoded `SAMPLE_RECIPES`
- [ ] No visual regression (cards look identical)
- [ ] `pnpm build` passes

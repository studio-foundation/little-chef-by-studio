# Recipes page — most recent WeeklyPlan Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the generic `recipe.findMany` in `RecipesPage` with a `weeklyPlan.findFirst` query that returns only the recipes from the most recent plan that has at least one recipe linked.

**Architecture:** Single Prisma query on `WeeklyPlan` filtered to plans with at least one `WeeklyPlanRecipe`, ordered by `weekStart desc`, including nested recipes ordered by `position`. Map using the existing `dbToRecipe` helper.

**Tech Stack:** Next.js App Router (RSC), Prisma, TypeScript

---

### Task 1: Update `RecipesPage` to use `weeklyPlan.findFirst`

**Files:**
- Modify: `app/(app)/recipes/page.tsx:63-73`

**Step 1: Replace the DB query block**

In `app/(app)/recipes/page.tsx`, replace lines 63–73:

```ts
// BEFORE
let recipes: Recipe[] = [];
try {
  const dbRecipes = await prisma.recipe.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  recipes = dbRecipes.map(dbToRecipe);
} catch (err) {
  console.error('[RecipesPage] DB error', err);
}
```

with:

```ts
// AFTER
let recipes: Recipe[] = [];
try {
  const latestPlan = await prisma.weeklyPlan.findFirst({
    where: { userId: session.user.id, recipes: { some: {} } },
    orderBy: { weekStart: 'desc' },
    include: {
      recipes: {
        include: { recipe: true },
        orderBy: { position: 'asc' },
      },
    },
  });
  recipes = (latestPlan?.recipes ?? []).map((wpr) => dbToRecipe(wpr.recipe));
} catch (err) {
  console.error('[RecipesPage] DB error', err);
}
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: build succeeds with no type errors.

**Step 3: Commit**

```bash
git add app/(app)/recipes/page.tsx
git commit -m "fix(recipes): show recipes from most recent successful WeeklyPlan"
```

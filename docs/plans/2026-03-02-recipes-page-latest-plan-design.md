# Design: Recipes page — show most recent successful WeeklyPlan

**Date:** 2026-03-02
**Scope:** `app/(app)/recipes/page.tsx` only

## Problem

The current `RecipesPage` fetches the 5 most recent `Recipe` rows for the user (`recipe.findMany { take: 5 }`), regardless of which `WeeklyPlan` they belong to. If a user has generated multiple weeks, the page shows a mix of recipes from different plans.

## Goal

Show only the recipes from the most recent `WeeklyPlan` that has at least one recipe linked to it ("success" = has recipes).

## Approach

Single Prisma query using `weeklyPlan.findFirst`:

```ts
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
```

- `recipes: { some: {} }` — excludes plans with zero linked recipes
- `weekStart: 'desc'` — most recent plan first
- `position: 'asc'` — preserves meal order from generation
- `dbToRecipe` already exists in scope, no changes needed

## What changes

| File | Change |
|------|--------|
| `app/(app)/recipes/page.tsx` | Replace `recipe.findMany` block with `weeklyPlan.findFirst` |

No schema changes, no new files, no other components touched.

## Empty state

Already handled in `RecipesGrid`: shows "Aucune recette pour l'instant" with a link to `/generate`.

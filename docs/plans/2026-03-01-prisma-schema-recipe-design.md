# Prisma Schema — Recipe, WeeklyPlan, WeeklyPlanRecipe Design

**Date :** 2026-03-01
**Ticket :** STU-207

## Contexte

Refonte du schéma Prisma pour supporter la persistance complète des recettes générées par Studio.
Migration destructive (pas de données à préserver en dev).

## Décisions clés

- **Recipe** : entité standalone liée à `User` (plus de FK vers `WeeklyPlan`)
- **GroceryList** : déplacée de `Recipe` → `WeeklyPlan` (une liste consolidée par semaine)
- **WeeklyPlanRecipe** : table junction avec `position` pour l'ordre des 5 recettes
- **Json fields** : `ingredients`, `steps`, `notes` stockés en Json Prisma, typés côté TypeScript

## Schéma Prisma

```prisma
model Recipe {
  id           String             @id @default(cuid())
  userId       String
  title        String
  cuisine      String?
  timeMinutes  Int?
  portions     Int?
  calories     Int?
  emoji        String?
  ingredients  Json
  steps        Json
  notes        Json?
  createdAt    DateTime           @default(now())
  user         User               @relation(fields: [userId], references: [id])
  weeklyPlans  WeeklyPlanRecipe[]
}

model WeeklyPlan {
  id          String             @id @default(cuid())
  userId      String
  weekStart   DateTime
  createdAt   DateTime           @default(now())
  user        User               @relation(fields: [userId], references: [id])
  recipes     WeeklyPlanRecipe[]
  groceryList GroceryList?
}

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

model GroceryList {
  id        String     @id @default(cuid())
  planId    String     @unique
  items     Json
  plan      WeeklyPlan @relation(fields: [planId], references: [id])
}
```

## TypeScript types (`src/types/recipe.ts`)

```typescript
export interface Ingredient {
  name: string;
  quantity: string;
  unit?: string;
  aisle?: string;
}

export interface RecipeStep {
  order: number;
  instruction: string;
  durationMinutes?: number;
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  cuisine?: string;
  timeMinutes?: number;
  portions?: number;
  calories?: number;
  emoji?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  notes?: string[];
  createdAt: string;
}

export interface WeeklyPlanRecipe {
  position: number;
  recipe: Recipe;
}

export interface WeeklyPlan {
  id: string;
  userId: string;
  weekStart: string;
  createdAt: string;
  recipes: WeeklyPlanRecipe[];
  groceryList?: GroceryList;
}

export interface GroceryList {
  id: string;
  planId: string;
  items: GroceryItem[];
}

export interface GroceryItem {
  name: string;
  quantity: string;
  unit?: string;
  aisle?: string;
  checked: boolean;
}
```

## Changements vs schéma actuel

| Modèle | Avant | Après |
|--------|-------|-------|
| `Recipe` | `planId FK`, `rawJson Json` | `userId FK`, champs explicites + `ingredients/steps/notes Json` |
| `WeeklyPlan` | `recipes Recipe[]` (direct) | `recipes WeeklyPlanRecipe[]` (junction) |
| `GroceryList` | `recipeId FK @unique` | `planId FK @unique` |
| `WeeklyPlanRecipe` | n/a | nouveau |

## Fichiers à modifier

- `prisma/schema.prisma` — remplacement des modèles
- `src/types/recipe.ts` — nouveau fichier
- `prisma/migrations/` — générée par `prisma migrate dev`

# STU-207 Prisma Schema Recipe Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer les modèles Prisma existants (Recipe, WeeklyPlan, GroceryList) par une structure normalisée avec table junction WeeklyPlanRecipe et types TypeScript explicites.

**Architecture:** Migration destructive (pas de données à préserver). Recipe devient une entité standalone liée à User via userId. WeeklyPlan et Recipe sont reliés via WeeklyPlanRecipe (junction table avec position). GroceryList passe de per-Recipe à per-WeeklyPlan.

**Tech Stack:** Prisma 7.4, PostgreSQL (Supabase), TypeScript 5, pnpm

---

## Contexte

Le schéma actuel a `Recipe.planId` (FK directe vers WeeklyPlan) et `GroceryList.recipeId`. On remplace par une architecture junction. Aucun fichier applicatif n'utilise encore le Prisma client (les pages utilisent localStorage ou Studio API), donc pas de pages à mettre à jour.

---

### Task 1: Créer le worktree STU-207

**Files:**
- Aucun fichier modifié dans cette tâche

**Step 1: Créer le worktree**

```bash
git worktree add .worktrees/stu-207-prisma-schema -b feat/stu-207-prisma-schema
```

**Step 2: Vérifier que le worktree est créé**

```bash
git worktree list
```

Expected: une ligne avec `.worktrees/stu-207-prisma-schema` et la branche `feat/stu-207-prisma-schema`

**Step 3: Se placer dans le worktree**

```bash
cd .worktrees/stu-207-prisma-schema
```

Tous les steps suivants s'exécutent depuis ce répertoire.

---

### Task 2: Remplacer prisma/schema.prisma

**Files:**
- Modify: `prisma/schema.prisma` (remplacer complètement)

**Step 1: Remplacer le contenu complet de `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

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

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Recipe {
  id          String             @id @default(cuid())
  userId      String
  title       String
  cuisine     String?
  timeMinutes Int?
  portions    Int?
  calories    Int?
  emoji       String?
  ingredients Json
  steps       Json
  notes       Json?
  createdAt   DateTime           @default(now())
  user        User               @relation(fields: [userId], references: [id])
  weeklyPlans WeeklyPlanRecipe[]
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
  id       String     @id @default(cuid())
  planId   String
  recipeId String
  position Int
  addedAt  DateTime   @default(now())
  plan     WeeklyPlan @relation(fields: [planId], references: [id])
  recipe   Recipe     @relation(fields: [recipeId], references: [id])

  @@unique([planId, recipeId])
  @@unique([planId, position])
}

model GroceryList {
  id      String     @id @default(cuid())
  planId  String     @unique
  items   Json
  plan    WeeklyPlan @relation(fields: [planId], references: [id])
}
```

**Step 2: Valider que le schéma est syntaxiquement correct**

```bash
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid`

Si erreur, corriger avant de continuer.

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): replace Recipe/WeeklyPlan/GroceryList with normalized schema"
```

---

### Task 3: Appliquer la migration

**Files:**
- Create: `prisma/migrations/<timestamp>_stu_207_schema_recipe/migration.sql` (généré automatiquement)

**Step 1: Lancer la migration**

```bash
npx prisma migrate dev --name stu-207-schema-recipe
```

Expected output:
```
Applying migration `<timestamp>_stu_207_schema_recipe`
The following migration(s) have been applied:
migrations/
  └─ <timestamp>_stu_207_schema_recipe/
    └─ migration.sql
```

Si la commande demande de confirmer la suppression de tables (drop), taper `y`.

**Step 2: Vérifier que la migration a créé les bonnes tables**

```bash
npx prisma studio
```

Ouvrir dans le navigateur et vérifier que les tables `Recipe`, `WeeklyPlan`, `WeeklyPlanRecipe`, `GroceryList` existent avec les bons champs. Fermer avec Ctrl+C.

Ou via psql si disponible :
```bash
# Alternative si psql disponible
psql $DATABASE_URL -c "\dt"
```

**Step 3: Commit la migration générée**

```bash
git add prisma/migrations/
git commit -m "feat(db): add migration stu-207-schema-recipe"
```

---

### Task 4: Créer src/types/recipe.ts

**Files:**
- Create: `src/types/recipe.ts`

**Step 1: Créer le fichier `src/types/recipe.ts`**

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

**Step 2: Vérifier que TypeScript compile le fichier**

```bash
npx tsc --noEmit src/types/recipe.ts 2>&1 || echo "check errors above"
```

Expected: aucune erreur (sortie vide ou juste le echo)

**Step 3: Commit**

```bash
git add src/types/recipe.ts
git commit -m "feat(types): add Recipe, WeeklyPlan, GroceryList TypeScript interfaces"
```

---

### Task 5: Vérifier le build complet

**Files:**
- Aucun fichier modifié dans cette tâche

**Step 1: Lancer le build Next.js**

```bash
pnpm build
```

Expected: build réussi sans erreurs TypeScript. Des warnings sur des pages non-utilisées sont OK.

Si des erreurs TypeScript apparaissent (imports cassés, types incompatibles), les corriger avant de continuer.

**Step 2: Si le build passe, commiter un message de confirmation**

Pas de fichier à commiter si le build passe sans modification.

---

### Task 6: Push et PR

**Files:**
- Aucun fichier modifié dans cette tâche

**Step 1: Push la branche**

```bash
git push -u origin feat/stu-207-prisma-schema
```

**Step 2: Créer la PR**

```bash
gh pr create \
  --title "feat(db): STU-207 — Prisma schema Recipe, WeeklyPlan, WeeklyPlanRecipe" \
  --body "$(cat <<'EOF'
## Summary

- Remplace les anciens modèles `Recipe` (avec `planId` FK) et `GroceryList` (avec `recipeId`) par une architecture normalisée
- `Recipe` devient standalone, lié à `User` via `userId`, avec champs explicites (`cuisine`, `timeMinutes`, `portions`, `calories`, `emoji`, `ingredients Json`, `steps Json`, `notes Json`)
- `WeeklyPlanRecipe` table junction avec `position` (ordre des 5 recettes de la semaine)
- `GroceryList` déplacée de per-Recipe vers per-WeeklyPlan
- Ajoute `src/types/recipe.ts` avec interfaces TypeScript complètes

## Test plan

- [ ] `npx prisma validate` passe sans erreur
- [ ] `npx prisma migrate dev` applique la migration sans erreur
- [ ] Les tables existent en DB avec les bons champs
- [ ] `pnpm build` passe sans erreur TypeScript

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main
```

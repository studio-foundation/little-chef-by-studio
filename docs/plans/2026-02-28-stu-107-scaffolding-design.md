# Design — STU-107 Scaffolding Next.js + Tailwind + Prisma

**Date :** 2026-02-28
**Ticket :** [STU-107](https://linear.app/studioag/issue/STU-107/scaffolding-nextjs-tailwind-prisma)
**Approche retenue :** B — Foundation avec design tokens

## Contexte

Le projet Little Chef a été initialisé avec Next.js 16, React 19, et Tailwind v4. Ce ticket pose les fondations structurelles : routes, layout, Prisma, et auth. L'objectif est d'avoir une app fonctionnelle avec les 5 routes accessibles, le design system de base branché, et l'infrastructure data/auth en place.

## Décisions clés

| Décision | Choix | Raison |
|---|---|---|
| Auth | next-auth v5 (beta) | Meilleure intégration App Router, supporte OAuth + Prisma adapter |
| DB Provider | PostgreSQL | Standard prod, Prisma supporte nativement |
| Approche scaffolding | B — Foundation avec design tokens | Pose la base visuelle pour les tickets suivants sans sur-ingénierie |

## Structure des fichiers

```
app/
├── layout.tsx                    # Root layout : fond ivoire, fonts, providers
├── globals.css                   # Tokens CSS Tailwind v4
├── page.tsx                      # Redirect → /onboarding
├── (app)/
│   ├── layout.tsx                # Layout avec navigation
│   ├── onboarding/page.tsx       # Placeholder
│   ├── generate/page.tsx         # Placeholder
│   ├── recipes/page.tsx          # Placeholder
│   ├── grocery-list/page.tsx     # Placeholder
│   └── history/page.tsx          # Placeholder
└── api/auth/[...nextauth]/
    └── route.ts                  # next-auth v5 handler

src/
└── components/
    └── nav.tsx                   # Navigation top bar

prisma/
├── schema.prisma
└── migrations/

middleware.ts                     # Protection des routes (app)
.env.local                        # STUDIO_API_URL, DATABASE_URL, NEXTAUTH_*
```

## Design tokens (globals.css)

Variables CSS Tailwind v4 :
- `--color-background: #FAF7F2` — ivoire/crème
- `--color-primary: #C4602D` — terra cotta
- `--color-secondary: #7A9E7E` — vert sauge
- `--color-text: #3B2A1A` — brun foncé

Typographie :
- Titres : Playfair Display (Google Fonts, chargé dans root layout)
- Corps : Geist Sans (déjà installé)

Le root layout applique `bg-background text-text` globalement.

## Navigation

Top bar avec logo "Little Chef" à gauche et 5 liens de navigation. Chaque page placeholder affiche son titre en Playfair Display + badge "En construction" en terra cotta.

## Prisma Schema

```prisma
model User {
  id        String       @id @default(cuid())
  email     String       @unique
  name      String?
  createdAt DateTime     @default(now())
  plans     WeeklyPlan[]
}

model WeeklyPlan {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  weekStart DateTime
  recipes   Recipe[]
  createdAt DateTime @default(now())
}

model Recipe {
  id          String      @id @default(cuid())
  planId      String
  plan        WeeklyPlan  @relation(fields: [planId], references: [id])
  title       String
  rawJson     Json
  createdAt   DateTime    @default(now())
  groceryList GroceryList?
}

model GroceryList {
  id       String @id @default(cuid())
  recipeId String @unique
  recipe   Recipe @relation(fields: [recipeId], references: [id])
  items    Json
}
```

## Auth — next-auth v5

- Provider : Google OAuth (pour démarrer rapidement)
- Adapter : `@auth/prisma-adapter` (session en DB)
- Protection : `middleware.ts` à la racine protège le groupe `(app)/`
- Première page après login : `/onboarding`

## Variables d'environnement

```env
STUDIO_API_URL=http://localhost:3001
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

## Critères d'acceptation (STU-107)

- [ ] `pnpm dev` fonctionne
- [ ] 5 routes accessibles (même vides)
- [ ] Prisma schema avec User, WeeklyPlan, Recipe, GroceryList
- [ ] Auth de base (next-auth v5 + Google)

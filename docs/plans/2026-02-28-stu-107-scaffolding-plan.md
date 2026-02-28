# STU-107 Scaffolding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformer le boilerplate Next.js en app Little Chef fonctionnelle avec 5 routes, design tokens, Prisma (PostgreSQL), et next-auth v5.

**Architecture:** Route group `(app)/` protégé par middleware next-auth v5. Prisma adapter stocke les sessions en DB. Design tokens Tailwind v4 dans globals.css (ivoire, terra cotta, vert sauge).

**Tech Stack:** Next.js 16 App Router, Tailwind v4, Prisma + PostgreSQL, next-auth v5 (beta), @auth/prisma-adapter, Google OAuth, pnpm

---

### Task 1: Créer le worktree et la branche

**Files:**
- No files modified — git operations only

**Step 1: Créer le worktree**

Depuis la racine du repo :
```bash
git worktree add .worktrees/stu-107 -b arianedguay/stu-107-scaffolding-nextjs-tailwind-prisma
```

**Step 2: Vérifier**

```bash
git worktree list
```
Expected: `.worktrees/stu-107` apparaît dans la liste.

**Step 3: Basculer dans le worktree**

```bash
cd .worktrees/stu-107
```

Tout le travail suivant se fait dans ce répertoire.

---

### Task 2: Installer les dépendances

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Step 1: Installer Prisma**

```bash
pnpm add prisma @prisma/client
```

**Step 2: Installer next-auth v5 et le Prisma adapter**

```bash
pnpm add next-auth@beta @auth/prisma-adapter
```

**Step 3: Vérifier que tout s'installe sans erreur**

```bash
pnpm install
```
Expected: no errors.

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add prisma, next-auth v5 dependencies"
```

---

### Task 3: Configurer les variables d'environnement

**Files:**
- Create: `.env.local`
- Create: `.env.example`

**Step 1: Créer `.env.local`**

```env
# Studio API
STUDIO_API_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/little_chef

# next-auth v5
AUTH_SECRET=<generate-with: openssl rand -base64 32>
AUTH_GOOGLE_ID=<your-google-client-id>
AUTH_GOOGLE_SECRET=<your-google-client-secret>
```

Pour générer `AUTH_SECRET` :
```bash
openssl rand -base64 32
```

**Step 2: Créer `.env.example`** (commité, sans valeurs sensibles)

```env
STUDIO_API_URL=http://localhost:3001
DATABASE_URL=postgresql://user:password@localhost:5432/little_chef
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

**Step 3: Vérifier que `.env.local` est ignoré par git**

```bash
git status
```
Expected: `.env.local` n'apparaît PAS dans les fichiers trackés (`.gitignore` contient `.env*`).

**Step 4: Commit**

```bash
git add .env.example
git commit -m "chore: add env.example with required variables"
```

---

### Task 4: Initialiser Prisma et écrire le schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/migrations/` (généré par Prisma)

**Step 1: Initialiser Prisma**

```bash
pnpm prisma init --datasource-provider postgresql
```

Cela crée `prisma/schema.prisma` avec la config de base.

**Step 2: Remplacer le contenu de `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
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

Note: les modèles `Account`, `Session`, `VerificationToken` sont requis par `@auth/prisma-adapter`.

**Step 3: Générer le client Prisma**

```bash
pnpm prisma generate
```
Expected: `✔ Generated Prisma Client`

**Step 4: Appliquer les migrations (si la DB tourne en local)**

```bash
pnpm prisma migrate dev --name init
```

Si pas de DB locale disponible, skipper cette étape — le schema est validé via `generate`.

**Step 5: Commit**

```bash
git add prisma/
git commit -m "config(studio): add prisma schema with User, WeeklyPlan, Recipe, GroceryList"
```

---

### Task 5: Configurer les design tokens

**Files:**
- Modify: `app/globals.css`

**Step 1: Remplacer le contenu de `app/globals.css`**

```css
@import "tailwindcss";

@theme inline {
  /* Couleurs Little Chef */
  --color-background: #FAF7F2;
  --color-primary: #C4602D;
  --color-primary-hover: #A84E24;
  --color-secondary: #7A9E7E;
  --color-text: #3B2A1A;
  --color-text-muted: #7A6A5A;
  --color-border: #E8E0D5;

  /* Fonts */
  --font-sans: var(--font-geist-sans);
  --font-serif: var(--font-playfair);
}

body {
  background-color: #FAF7F2;
  color: #3B2A1A;
}
```

**Step 2: Vérifier que `pnpm dev` démarre**

```bash
pnpm dev
```
Expected: `ready on http://localhost:3000` sans erreur.

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style(ui): add Little Chef design tokens to globals.css"
```

---

### Task 6: Mettre à jour le root layout

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Remplacer `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Little Chef",
  description: "Ton meal planner hebdomadaire ND-friendly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${playfairDisplay.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

**Step 2: Vérifier**

```bash
pnpm dev
```
Expected: page accessible sur http://localhost:3000, fond ivoire visible.

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "style(ui): update root layout with Little Chef fonts and metadata"
```

---

### Task 7: Créer la page racine (redirect)

**Files:**
- Modify: `app/page.tsx`

**Step 1: Remplacer `app/page.tsx`**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/onboarding");
}
```

**Step 2: Vérifier**

```bash
pnpm dev
```
Ouvrir http://localhost:3000 → doit rediriger vers `/onboarding` (qui n'existe pas encore — 404 attendu pour l'instant).

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(onboarding): redirect root to /onboarding"
```

---

### Task 8: Créer le composant Navigation

**Files:**
- Create: `src/components/nav.tsx`

**Step 1: Créer `src/components/nav.tsx`**

```tsx
import Link from "next/link";

const navLinks = [
  { href: "/onboarding", label: "Profil" },
  { href: "/generate", label: "Générer" },
  { href: "/recipes", label: "Recettes" },
  { href: "/grocery-list", label: "Épicerie" },
  { href: "/history", label: "Historique" },
];

export function Nav() {
  return (
    <nav className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link
          href="/onboarding"
          className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--color-primary)]"
        >
          Little Chef
        </Link>
        <ul className="flex items-center gap-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/nav.tsx
git commit -m "style(ui): add Nav component with Little Chef links"
```

---

### Task 9: Créer le route group (app)/ avec layout

**Files:**
- Create: `app/(app)/layout.tsx`

**Step 1: Créer le dossier et le layout**

```bash
mkdir -p app/\(app\)
```

**Step 2: Créer `app/(app)/layout.tsx`**

```tsx
import { Nav } from "@/src/components/nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/\(app\)/layout.tsx
git commit -m "style(ui): add (app) route group layout with Nav"
```

---

### Task 10: Créer les 5 pages placeholder

**Files:**
- Create: `app/(app)/onboarding/page.tsx`
- Create: `app/(app)/generate/page.tsx`
- Create: `app/(app)/recipes/page.tsx`
- Create: `app/(app)/grocery-list/page.tsx`
- Create: `app/(app)/history/page.tsx`

**Step 1: Créer les dossiers**

```bash
mkdir -p app/\(app\)/onboarding app/\(app\)/generate app/\(app\)/recipes app/\(app\)/grocery-list app/\(app\)/history
```

**Step 2: Créer `app/(app)/onboarding/page.tsx`**

```tsx
export default function OnboardingPage() {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--color-text)]">
        Mon profil
      </h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        <span className="inline-block rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs text-white">
          En construction
        </span>
      </p>
    </div>
  );
}
```

**Step 3: Créer `app/(app)/generate/page.tsx`**

```tsx
export default function GeneratePage() {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--color-text)]">
        Générer ma semaine
      </h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        <span className="inline-block rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs text-white">
          En construction
        </span>
      </p>
    </div>
  );
}
```

**Step 4: Créer `app/(app)/recipes/page.tsx`**

```tsx
export default function RecipesPage() {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--color-text)]">
        Mes recettes
      </h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        <span className="inline-block rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs text-white">
          En construction
        </span>
      </p>
    </div>
  );
}
```

**Step 5: Créer `app/(app)/grocery-list/page.tsx`**

```tsx
export default function GroceryListPage() {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--color-text)]">
        Liste d&apos;épicerie
      </h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        <span className="inline-block rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs text-white">
          En construction
        </span>
      </p>
    </div>
  );
}
```

**Step 6: Créer `app/(app)/history/page.tsx`**

```tsx
export default function HistoryPage() {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--color-text)]">
        Historique
      </h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        <span className="inline-block rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs text-white">
          En construction
        </span>
      </p>
    </div>
  );
}
```

**Step 7: Vérifier les 5 routes**

```bash
pnpm dev
```

Ouvrir dans le navigateur :
- http://localhost:3000/onboarding → titre "Mon profil" ✓
- http://localhost:3000/generate → titre "Générer ma semaine" ✓
- http://localhost:3000/recipes → titre "Mes recettes" ✓
- http://localhost:3000/grocery-list → titre "Liste d'épicerie" ✓
- http://localhost:3000/history → titre "Historique" ✓

**Step 8: Commit**

```bash
git add app/\(app\)/
git commit -m "feat(routes): add 5 placeholder pages with design tokens"
```

---

### Task 11: Configurer next-auth v5

**Files:**
- Create: `auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `src/lib/prisma.ts`

**Step 1: Créer le singleton Prisma `src/lib/prisma.ts`**

```bash
mkdir -p src/lib
```

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 2: Créer `auth.ts` à la racine**

```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
});
```

**Step 3: Créer `app/api/auth/[...nextauth]/route.ts`**

```bash
mkdir -p app/api/auth/\[...nextauth\]
```

```ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

**Step 4: Vérifier que TypeScript compile**

```bash
pnpm tsc --noEmit
```
Expected: no errors. Si erreur sur `@auth/prisma-adapter`, vérifier que les modèles `Account`, `Session`, `VerificationToken` sont bien dans `schema.prisma`.

**Step 5: Commit**

```bash
git add auth.ts app/api/ src/lib/prisma.ts
git commit -m "feat(auth): configure next-auth v5 with Google provider and Prisma adapter"
```

---

### Task 12: Créer la page login et le middleware de protection

**Files:**
- Create: `app/login/page.tsx`
- Create: `middleware.ts`

**Step 1: Créer `app/login/page.tsx`**

```tsx
import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-background)]">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-sm">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-text)]">
          Little Chef
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Ton meal planner hebdomadaire ND-friendly
        </p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/onboarding" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-full bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Continuer avec Google
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Créer `middleware.ts` à la racine**

```ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLoginPage = req.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isOnLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 3: Vérifier**

```bash
pnpm dev
```

Ouvrir http://localhost:3000 → doit rediriger vers `/login`.
Expected: page login avec bouton "Continuer avec Google" visible.

**Step 4: Commit**

```bash
git add app/login/page.tsx middleware.ts
git commit -m "feat(auth): add login page and middleware route protection"
```

---

### Task 13: Build final et vérification des critères d'acceptation

**Step 1: Build de production**

```bash
pnpm build
```
Expected: `✓ Compiled successfully` — zéro erreur TypeScript ou Webpack.

**Step 2: Checklist des critères STU-107**

- [ ] `pnpm dev` fonctionne → vérifié à chaque step
- [ ] 5 routes accessibles (même vides) → `/onboarding`, `/generate`, `/recipes`, `/grocery-list`, `/history`
- [ ] Prisma schema avec User, WeeklyPlan, Recipe, GroceryList → `prisma/schema.prisma`
- [ ] Auth de base (next-auth v5 + Google) → `auth.ts` + middleware

**Step 3: Push et PR**

```bash
git push -u origin arianedguay/stu-107-scaffolding-nextjs-tailwind-prisma
gh pr create \
  --title "feat: scaffolding Next.js + Tailwind + Prisma (STU-107)" \
  --body "## Summary
- 5 routes avec layout et design tokens Little Chef
- Prisma schema : User, WeeklyPlan, Recipe, GroceryList + tables next-auth
- next-auth v5 avec Google OAuth + PrismaAdapter
- Middleware de protection des routes

Closes STU-107" \
  --base main
```

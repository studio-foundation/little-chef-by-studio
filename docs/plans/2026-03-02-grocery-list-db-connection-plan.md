# STU-210 — Connecter /grocery-list aux données DB

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer `GROCERY_DATA` hardcodé dans `/grocery-list` par les vraies données de la table `GroceryList` en DB, liée au `WeeklyPlan` le plus récent du user.

**Architecture:** Server Component `page.tsx` qui appelle `GET /api/grocery-list` (auth + Prisma + transformation flat→grouped), puis passe les groupes au Client Component `GroceryListClient.tsx` qui contient tout le code interactif (checkboxes localStorage, copy, progress bar). Même pattern que `/recipes`.

**Tech Stack:** Next.js 16 App Router, TypeScript 5, Prisma (PostgreSQL), NextAuth (`auth()`), Tailwind v4, pnpm

---

## Pré-requis : Worktree

**RÈGLE OBLIGATOIRE** — toujours un worktree pour un ticket Linear.

```bash
git worktree add .worktrees/stu-210-grocery-list-db -b feat/stu-210-grocery-list-db
cd .worktrees/stu-210-grocery-list-db
```

Tout le travail se fait dans ce worktree.

---

## Fichiers concernés

| Action | Chemin |
|--------|--------|
| Créer | `app/api/grocery-list/route.ts` |
| Créer | `app/(app)/grocery-list/GroceryListClient.tsx` |
| Modifier | `app/(app)/grocery-list/page.tsx` |

**Lire en référence :**
- `app/api/recipes/route.ts` — pattern API route avec auth + Prisma
- `app/(app)/recipes/page.tsx` — pattern Server Component → Client Component
- `prisma/schema.prisma` — modèles `WeeklyPlan`, `GroceryList`
- `grocery_list_output.json` — format réel des items du pipeline

---

### Task 1 : Créer `app/api/grocery-list/route.ts`

**Files:**
- Create: `app/api/grocery-list/route.ts`

**Step 1: Créer le répertoire et le fichier**

```bash
mkdir -p app/api/grocery-list
```

**Step 2: Écrire la route**

```typescript
// app/api/grocery-list/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/src/lib/prisma';

// --- Types ---

type DbItem = { name: string; quantity: string; group: string };

export type GroceryGroup = {
  rayon: string;
  bg: string;
  accent: string;
  items: { id: string; name: string; qty: string }[];
};

// --- Mapping group → rayon ---

type RayonConfig = { rayon: string; bg: string; accent: string };

const RAYON_MAP: { keywords: string[]; config: RayonConfig }[] = [
  {
    keywords: ['légume', 'fruit', 'légumes & fruits'],
    config: { rayon: '🥬 Légumes & fruits', bg: '#EDF3EE', accent: '#4a7c59' },
  },
  {
    keywords: ['protéine', 'viande', 'poisson', 'volaille'],
    config: { rayon: '🥩 Protéines', bg: '#FAF0EE', accent: '#C4602D' },
  },
  {
    keywords: ['épicerie sèche', 'féculent', 'céréale', 'pâte', 'riz', 'légumineuse'],
    config: { rayon: '🌾 Épicerie sèche', bg: '#FAF4EB', accent: '#A87C3A' },
  },
  {
    keywords: ['condiment', 'sauce'],
    config: { rayon: '🧴 Condiments & sauces', bg: '#F3EDF7', accent: '#8B5BA8' },
  },
  {
    keywords: ['épice', 'aromate'],
    config: { rayon: '🧂 Épices & aromates', bg: '#FAF6E8', accent: '#A87C3A' },
  },
  {
    keywords: ['produit frais', 'frais', 'laitier', 'fromage'],
    config: { rayon: '🧀 Frais & autres', bg: '#EEF4FA', accent: '#4A6F96' },
  },
];

const FALLBACK_RAYON: RayonConfig = {
  rayon: '📦 Autres',
  bg: '#F5F5F0',
  accent: '#888',
};

function groupToRayon(group: string): RayonConfig {
  const normalized = group.toLowerCase().trim();
  for (const { keywords, config } of RAYON_MAP) {
    if (keywords.some((kw) => normalized.includes(kw))) return config;
  }
  return FALLBACK_RAYON;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function transformItems(items: DbItem[]): GroceryGroup[] {
  const byGroup = new Map<string, { config: RayonConfig; items: DbItem[] }>();

  for (const item of items) {
    const config = groupToRayon(item.group ?? '');
    const key = config.rayon;
    if (!byGroup.has(key)) byGroup.set(key, { config, items: [] });
    byGroup.get(key)!.items.push(item);
  }

  return [...byGroup.entries()].map(([, { config, items }]) => ({
    rayon: config.rayon,
    bg: config.bg,
    accent: config.accent,
    items: items.map((i) => ({
      id: slugify(i.name),
      name: i.name,
      qty: i.quantity,
    })),
  }));
}

// --- Route ---

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const plan = await prisma.weeklyPlan.findFirst({
      where: {
        userId: session.user.id,
        groceryList: { isNot: null },
      },
      orderBy: { weekStart: 'desc' },
      include: { groceryList: true },
    });

    if (!plan?.groceryList) {
      return NextResponse.json({ empty: true });
    }

    const rawItems = plan.groceryList.items as DbItem[];
    const groups = transformItems(rawItems);

    return NextResponse.json({
      weekStart: plan.weekStart.toISOString(),
      groups,
    });
  } catch (err) {
    console.error('[GET /api/grocery-list]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 3: Vérifier que TypeScript compile**

```bash
pnpm tsc --noEmit
```

Expected: aucune erreur sur ce fichier.

**Step 4: Tester manuellement la route (optionnel, si Studio tourne)**

```bash
curl -b 'next-auth.session-token=...' http://localhost:3000/api/grocery-list
```

Expected (si aucune GroceryList en DB) : `{"empty":true}`
Expected (si GroceryList en DB) : `{"weekStart":"...","groups":[...]}`

**Step 5: Commit**

```bash
git add app/api/grocery-list/route.ts
git commit -m "feat(grocery): GET /api/grocery-list — auth + prisma + transform"
```

---

### Task 2 : Créer `GroceryListClient.tsx`

**Files:**
- Create: `app/(app)/grocery-list/GroceryListClient.tsx`
- Référence: `app/(app)/grocery-list/page.tsx` (code à extraire)

C'est une extraction quasi-exacte du code interactif de `page.tsx` actuel. On adapte :
- Le composant reçoit `groups` et `weekStart` en props
- Le sous-titre utilise `weekStart` au lieu de la date hardcodée
- On importe le type `GroceryGroup` depuis la route API

**Step 1: Écrire `GroceryListClient.tsx`**

```typescript
// app/(app)/grocery-list/GroceryListClient.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/src/components/ui";
import type { GroceryGroup } from "@/app/api/grocery-list/route";

function buildExportText(
  groups: GroceryGroup[],
  checked: Set<string>,
): string {
  return groups
    .map((group) => {
      const remaining = group.items.filter((i) => !checked.has(i.id));
      if (remaining.length === 0) return null;
      const lines = remaining.map((i) => `  • ${i.name} — ${i.qty}`).join("\n");
      return `${group.rayon}\n${lines}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function GroceryGroupCard({
  group,
  checked,
  onToggle,
}: {
  group: GroceryGroup;
  checked: Set<string>;
  onToggle: (id: string) => void;
}) {
  const total = group.items.length;
  const done = group.items.filter((i) => checked.has(i.id)).length;
  const allDone = done === total;

  return (
    <div
      className="mb-3.5 overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-opacity duration-300"
      style={{ opacity: allDone ? 0.6 : 1 }}
    >
      <div
        className="flex items-center justify-between px-[18px] py-3"
        style={{ background: group.bg }}
      >
        <span className="font-[family-name:var(--font-playfair)] text-[15px] font-bold text-[var(--color-text)]">
          {group.rayon}
        </span>
        <span
          className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-semibold"
          style={{ color: group.accent }}
        >
          {done}/{total}
        </span>
      </div>

      <div>
        {group.items.map((item, i) => {
          const isChecked = checked.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              className={[
                "flex w-full cursor-pointer items-center gap-3.5 px-[18px] py-3 text-left transition-colors",
                i < group.items.length - 1
                  ? "border-b border-[var(--color-border)]"
                  : "",
                isChecked ? "bg-[#fafaf8]" : "bg-white hover:bg-[#fdf9f6]",
              ].join(" ")}
            >
              <div
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200"
                style={{
                  borderColor: isChecked ? group.accent : "#ddd",
                  background: isChecked ? group.accent : "#fff",
                  transform: isChecked ? "scale(1.05)" : "scale(1)",
                }}
              >
                {isChecked && (
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                    <path
                      d="M1 4L4.5 7.5L11 1"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              <span
                className={`flex-1 text-[15px] transition-all duration-200 ${
                  isChecked
                    ? "text-[#bbb] line-through"
                    : "text-[var(--color-text)]"
                }`}
              >
                {item.name}
              </span>

              <span
                className={`shrink-0 text-[13px] font-semibold transition-colors duration-200 ${
                  isChecked ? "text-[#ccc]" : "text-[var(--color-text-muted)]"
                }`}
              >
                {item.qty}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const STORAGE_KEY = "grocery-checked";

function formatWeekStart(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export function GroceryListClient({
  groups,
  weekStart,
}: {
  groups: GroceryGroup[];
  weekStart: string;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const allIds = groups.flatMap((g) => g.items.map((i) => i.id));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setChecked(new Set(JSON.parse(saved) as string[]));
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
      } catch {
        // ignore storage errors
      }
      return s;
    });
  };

  const totalItems = allIds.length;
  const doneItems = checked.size;
  const progress = totalItems > 0 ? (doneItems / totalItems) * 100 : 0;

  const handleCopy = () => {
    const text = buildExportText(groups, checked);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mx-auto max-w-xl pb-20">
      <div className="mb-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-text)]">
              Liste d&apos;épicerie
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Semaine du {formatWeekStart(weekStart)} · {totalItems} articles · 5 recettes
            </p>
          </div>
          <Button
            variant={copied ? "ghost" : "outline"}
            size="sm"
            onClick={handleCopy}
          >
            {copied ? "✓ Copié !" : "📋 Tout copier"}
          </Button>
        </div>

        <div>
          <div className="mb-1.5 flex justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">
              {doneItems === 0
                ? "Aucun article coché"
                : doneItems === totalItems
                  ? "Tout est dans le panier 🛒"
                  : `${doneItems} article${doneItems > 1 ? "s" : ""} coché${doneItems > 1 ? "s" : ""}`}
            </span>
            {doneItems > 0 && (
              <button
                onClick={() => {
                  setChecked(new Set());
                  try {
                    localStorage.removeItem(STORAGE_KEY);
                  } catch {
                    /* ignore */
                  }
                }}
                className="text-xs text-[var(--color-text-muted)] underline hover:text-[var(--color-text)]"
              >
                Tout décocher
              </button>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[var(--color-secondary)] transition-[width] duration-500 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {groups.map((group) => (
        <GroceryGroupCard
          key={group.rayon}
          group={group}
          checked={checked}
          onToggle={toggle}
        />
      ))}

      {doneItems === totalItems && totalItems > 0 && (
        <div className="animate-[fadeSlideUp_0.4s_ease] py-8 text-center">
          <div className="mb-3 text-5xl">🛒</div>
          <p className="mb-1.5 font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--color-text)]">
            Courses terminées !
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Tout est dans le panier. Bonne cuisine.
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Vérifier TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: aucune erreur.

**Step 3: Commit**

```bash
git add app/(app)/grocery-list/GroceryListClient.tsx
git commit -m "feat(grocery): GroceryListClient — extraire code interactif de page.tsx"
```

---

### Task 3 : Refactorer `page.tsx` en Server Component

**Files:**
- Modify: `app/(app)/grocery-list/page.tsx`

**Step 1: Remplacer tout le contenu de `page.tsx`**

```typescript
// app/(app)/grocery-list/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { GroceryListClient } from "./GroceryListClient";
import type { GroceryGroup } from "@/app/api/grocery-list/route";

type ApiResponse =
  | { empty: true }
  | { weekStart: string; groups: GroceryGroup[] };

export default async function GroceryListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let data: ApiResponse = { empty: true };
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/grocery-list`, {
      cache: "no-store",
      headers: {
        // Pass cookie for server-side auth
        Cookie: `next-auth.session-token=${session.user.id}`,
      },
    });
    if (res.ok) {
      data = (await res.json()) as ApiResponse;
    }
  } catch (err) {
    console.error("[GroceryListPage] fetch error", err);
  }

  if ("empty" in data) {
    return (
      <div className="mx-auto max-w-xl pb-20">
        <h1 className="mb-1 font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-text)]">
          Liste d&apos;épicerie
        </h1>
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="text-5xl">🛒</div>
          <p className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--color-text)]">
            Aucune liste d&apos;épicerie
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Génère ton premier plan de semaine pour voir ta liste apparaître ici.
          </p>
          <Link
            href="/generate"
            className="mt-2 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Générer un plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <GroceryListClient
      groups={data.groups}
      weekStart={data.weekStart}
    />
  );
}
```

> **Note sur le fetch server-side :** Next.js Server Components peuvent appeler leurs propres routes API, mais le cookie de session doit être forwardé. Une alternative plus simple serait de lire Prisma directement (comme `/recipes/page.tsx`), mais on garde la route API pour respecter le design. Si le fetch via cookie cause des problèmes, fallback sur Prisma direct.

**Step 2: Vérifier TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: aucune erreur.

**Step 3: Build complet**

```bash
pnpm build
```

Expected: build passe sans erreur.

**Step 4: Commit**

```bash
git add app/(app)/grocery-list/page.tsx
git commit -m "feat(grocery): STU-210 — connecter /grocery-list aux données DB"
```

---

### Task 4 : Vérification finale

**Step 1: Build de vérification**

```bash
pnpm build
```

Expected: 0 erreur, 0 warning TypeScript.

**Step 2: Test manuel (si app en cours)**

```bash
pnpm dev
```

Scénarios à tester :
1. **Aucune GroceryList en DB** → état vide avec lien "Générer un plan"
2. **GroceryList existante** → items groupés par rayon, checkboxes fonctionnelles, copy, progress bar
3. **Non authentifié** → redirect vers `/login`

**Step 3: Push + PR**

```bash
git push -u origin feat/stu-210-grocery-list-db
gh pr create \
  --title "feat(grocery): STU-210 — connecter /grocery-list aux données DB" \
  --body "$(cat <<'EOF'
## Changements

- `GET /api/grocery-list` : auth + Prisma + transformation flat→grouped (mapping group→rayon avec emojis et couleurs)
- `GroceryListClient.tsx` : extraction du code interactif de page.tsx (checkboxes localStorage, copy, progress bar)
- `page.tsx` : refactor en Server Component, état vide si aucun plan

## Test plan

- [ ] `pnpm build` passe
- [ ] `/grocery-list` affiche les items réels si une GroceryList existe en DB
- [ ] État vide si aucun WeeklyPlan avec GroceryList
- [ ] Checkboxes et export texte fonctionnels
- [ ] Non authentifié → redirect login

Closes STU-210
EOF
)" \
  --base main
```

---

## Résumé des commits attendus

```
feat(grocery): GET /api/grocery-list — auth + prisma + transform
feat(grocery): GroceryListClient — extraire code interactif de page.tsx
feat(grocery): STU-210 — connecter /grocery-list aux données DB
```

---

## Note importante sur le fetch server-side

Si le forward du cookie session dans `page.tsx` s'avère fragile (header `Cookie` pas reconnu en dev vs prod), remplacer le `fetch` par une lecture Prisma directe — exactement comme `app/(app)/recipes/page.tsx`. La logique de transformation serait dupliquée depuis `route.ts`, ou extraite dans un module partagé `src/lib/grocery.ts`. La route API `GET /api/grocery-list` reste utile pour les clients JS côté browser si besoin futur.

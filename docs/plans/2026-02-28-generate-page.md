# Generate Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformer la page `/generate` pour qu'elle reproduise la maquette `LittleChefGeneration`, avec les 3 états idle/generating/success, les composants de recette, et une refonte du Nav.

**Architecture:** Client Components avec sous-composants séparés dans `src/components/generate/`. La page `/generate` orchestre l'état local. Le Nav existant est mis à jour au lieu d'en créer un nouveau.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, CSS variables existantes (`--color-primary` terra cotta, `--color-secondary` vert sauge)

**No test setup** in this project — no TDD steps, focus on implementation + `pnpm build` verification.

---

## Design Reference

La maquette source : `src/components/LittleChefGeneration` (standalone React component avec inline styles à adapter).

Palette projet :
- `--color-primary: #C4602D` (terra cotta) → remplace `#4a7c59` de la maquette
- `--color-secondary: #7A9E7E` (vert sauge) → accent secondaire
- `--color-background: #FAF7F2` (ivoire)
- `--color-border: #E8E0D5`
- `--color-text: #3B2A1A`
- `--color-text-muted: #7A6A5A`

Fonts : `font-[family-name:var(--font-playfair)]` pour serif, `font-[family-name:var(--font-sans)]` pour sans-serif (Geist).

---

### Task 1: Refonte du composant Nav

**Files:**
- Modify: `src/components/nav.tsx`

**Context:** Le Nav actuel est fonctionnel mais peu stylé. La maquette a un header sticky, fond blanc, logo emoji + Playfair Display, liens avec état actif (couleur terra cotta + underline). On garde le `usePathname()` de Next.js pour détecter le lien actif.

**Step 1: Modifier nav.tsx**

Remplacer le contenu de `src/components/nav.tsx` par :

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/generate", label: "Ma semaine" },
  { href: "/recipes", label: "Recettes" },
  { href: "/onboarding", label: "Profil" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/generate" className="flex items-center gap-2">
          <span className="text-2xl">🍳</span>
          <span className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--color-text)]">
            little chef
          </span>
        </Link>
        <ul className="flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={[
                    "pb-0.5 text-sm transition-colors",
                    isActive
                      ? "border-b-2 border-[var(--color-primary)] font-bold text-[var(--color-primary)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
```

**Step 2: Vérifier le build**

```bash
pnpm build
```
Expected: aucune erreur TypeScript ni Tailwind.

**Step 3: Commit**

```bash
git add src/components/nav.tsx
git commit -m "style(nav): refonte header avec sticky, logo Playfair, lien actif terra cotta"
```

---

### Task 2: Créer SkeletonCard

**Files:**
- Create: `src/components/generate/SkeletonCard.tsx`

**Context:** Card animée affichée pendant la génération avant qu'une recette soit prête. Shimmer via une `@keyframes` Tailwind arbitraire ou une classe CSS. La hauteur totale doit correspondre à RecipeCard (~260px).

**Step 1: Créer le fichier**

```tsx
export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* Zone image skeleton */}
      <div className="h-40 animate-pulse bg-gradient-to-r from-[#f0f0f0] via-[#f8f8f8] to-[#f0f0f0]" />
      {/* Zone contenu skeleton */}
      <div className="p-4">
        <div className="mb-2 h-[18px] w-4/5 animate-pulse rounded-md bg-[#f0f0f0]" />
        <div className="mb-4 h-3.5 w-3/5 animate-pulse rounded-md bg-[#f0f0f0]" />
        <div className="flex gap-2">
          <div className="h-6 w-[70px] animate-pulse rounded-full bg-[#f0f0f0]" />
          <div className="h-6 w-[55px] animate-pulse rounded-full bg-[#f0f0f0]" />
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Build check**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add src/components/generate/SkeletonCard.tsx
git commit -m "feat(generate): add SkeletonCard component"
```

---

### Task 3: Créer ProgressBar

**Files:**
- Create: `src/components/generate/ProgressBar.tsx`

**Context:** Barre de progression affichant `current/total` recettes générées. Dégradé terra cotta, transition CSS fluide, label à gauche et compteur à droite.

**Step 1: Créer le fichier**

```tsx
interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-2 flex justify-between text-sm text-[var(--color-text-muted)]">
        <span>
          {current} recette{current !== 1 ? "s" : ""} générée
          {current !== 1 ? "s" : ""}
        </span>
        <span className="font-semibold text-[var(--color-primary)]">
          {current}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-primary)] transition-[width] duration-500 ease-in-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

**Step 2: Build check**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add src/components/generate/ProgressBar.tsx
git commit -m "feat(generate): add ProgressBar component"
```

---

### Task 4: Créer RecipeCard

**Files:**
- Create: `src/components/generate/RecipeCard.tsx`

**Context:** Card recette complète avec zone couleur + emoji en haut, badges temps/kcal, nom Playfair, description, tags pills. Animation bounce-in à l'apparition (via `useState` + `useEffect`).

**Step 1: Créer le type Recipe**

Créer `src/components/generate/types.ts` :

```ts
export interface Recipe {
  name: string;
  time: string;
  kcal: string;
  tags: string[];
  emoji: string;
  color: string;   // bg couleur légère ex: "#FFF3E0"
  accent: string;  // couleur vive ex: "#FF9800"
  desc: string;
}
```

**Step 2: Créer RecipeCard.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Recipe } from "./types";

interface RecipeCardProps {
  recipe: Recipe;
  visible: boolean;
}

export function RecipeCard({ recipe, visible }: RecipeCardProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShow(true), 80);
      return () => clearTimeout(t);
    }
  }, [visible]);

  return (
    <div
      className="cursor-pointer overflow-hidden rounded-2xl bg-white transition-all duration-500"
      style={{
        boxShadow: show
          ? "0 4px 20px rgba(0,0,0,0.08)"
          : "0 2px 8px rgba(0,0,0,0.04)",
        transform: show ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
        opacity: show ? 1 : 0,
        transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {/* Zone image */}
      <div
        className="relative flex h-40 items-center justify-center text-[52px]"
        style={{
          background: `linear-gradient(135deg, ${recipe.color} 0%, ${recipe.accent}22 100%)`,
        }}
      >
        <span
          className="transition-transform duration-500"
          style={{
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
            transform: show ? "scale(1)" : "scale(0.7)",
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            transitionDelay: "0.2s",
          }}
        >
          {recipe.emoji}
        </span>
        {/* Badges temps / kcal */}
        <div className="absolute bottom-2.5 right-2.5 flex gap-2">
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-muted)]">
            ⏱ {recipe.time}
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-muted)]">
            🔥 {recipe.kcal}
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-4 pb-4 pt-3">
        <h3 className="mb-1.5 font-[family-name:var(--font-playfair)] text-[15px] font-bold leading-snug text-[var(--color-text)]">
          {recipe.name}
        </h3>
        <p className="mb-3 text-[13px] leading-snug text-[var(--color-text-muted)]">
          {recipe.desc}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: recipe.color, color: recipe.accent }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Build check**

```bash
pnpm build
```

**Step 4: Commit**

```bash
git add src/components/generate/types.ts src/components/generate/RecipeCard.tsx
git commit -m "feat(generate): add RecipeCard component with bounce-in animation"
```

---

### Task 5: Implémenter la page /generate

**Files:**
- Modify: `app/(app)/generate/page.tsx`

**Context:** Page client qui orchestre les 3 états. Utilise les composants créés aux tâches 2-4. Les données sont statiques pour l'instant (maquette) — l'intégration SSE Studio viendra plus tard.

**Step 1: Créer les données sample**

Créer `src/components/generate/sampleData.ts` :

```ts
import type { Recipe } from "./types";

export const SAMPLE_RECIPES: Recipe[] = [
  {
    name: "Bol de quinoa aux légumes rôtis",
    time: "25 min",
    kcal: "480 kcal",
    tags: ["Végétarien", "Facile"],
    emoji: "🥗",
    color: "#E8F5E9",
    accent: "#4CAF50",
    desc: "Quinoa, courge butternut, poivrons, tahini citronné",
  },
  {
    name: "Saumon teriyaki au riz jasmin",
    time: "20 min",
    kcal: "560 kcal",
    tags: ["Sans gluten", "Rapide"],
    emoji: "🐟",
    color: "#FFF3E0",
    accent: "#FF9800",
    desc: "Filet de saumon, riz jasmin, brocoli, sauce teriyaki maison",
  },
  {
    name: "Pasta e fagioli",
    time: "35 min",
    kcal: "420 kcal",
    tags: ["Végétarien", "Confort"],
    emoji: "🍝",
    color: "#FCE4EC",
    accent: "#E91E63",
    desc: "Haricots borlotti, petites pâtes, tomates, romarin",
  },
  {
    name: "Poulet miso aux champignons",
    time: "30 min",
    kcal: "510 kcal",
    tags: ["Protéines", "Umami"],
    emoji: "🍗",
    color: "#F3E5F5",
    accent: "#9C27B0",
    desc: "Cuisse de poulet, shiitakes, pâte miso blanche, gingembre",
  },
  {
    name: "Tacos de lentilles épicées",
    time: "25 min",
    kcal: "390 kcal",
    tags: ["Végétalien", "Épicé"],
    emoji: "🌮",
    color: "#FFF8E1",
    accent: "#FFC107",
    desc: "Lentilles beluga, avocat, salsa verde, crème de cajou",
  },
];

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

**Step 2: Réécrire la page**

Remplacer `app/(app)/generate/page.tsx` par :

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ProgressBar } from "@/src/components/generate/ProgressBar";
import { RecipeCard } from "@/src/components/generate/RecipeCard";
import { SkeletonCard } from "@/src/components/generate/SkeletonCard";
import {
  GENERATION_MESSAGES,
  SAMPLE_RECIPES,
} from "@/src/components/generate/sampleData";

type GenerationState = "idle" | "generating" | "success";

export default function GeneratePage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [revealed, setRevealed] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGeneration = () => {
    setState("generating");
    setRevealed(0);
    setMsgIndex(0);

    let msg = 0;
    msgRef.current = setInterval(() => {
      msg++;
      if (msg < GENERATION_MESSAGES.length - 1) setMsgIndex(msg);
    }, 1800);

    let count = 0;
    intervalRef.current = setInterval(() => {
      count++;
      setRevealed(count);
      if (count >= SAMPLE_RECIPES.length) {
        clearInterval(intervalRef.current!);
        clearInterval(msgRef.current!);
        setMsgIndex(GENERATION_MESSAGES.length - 1);
        setTimeout(() => setState("success"), 800);
      }
    }, 1400);
  };

  const cancel = () => {
    clearInterval(intervalRef.current!);
    clearInterval(msgRef.current!);
    setState("idle");
    setRevealed(0);
  };

  const reset = () => {
    setState("idle");
    setRevealed(0);
    setMsgIndex(0);
  };

  // Nettoyage si le composant est démonté pendant la génération
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current!);
      clearInterval(msgRef.current!);
    };
  }, []);

  const isIdle = state === "idle";
  const isGenerating = state === "generating";
  const isDone = state === "success";

  return (
    <>
      {/* Titre + sous-titre + actions */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mb-1.5 font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-text)]">
              {isDone ? "Ta semaine est prête 🎉" : "Ma semaine"}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {isIdle && "5 repas générés selon tes préférences"}
              {isGenerating && (
                <span key={msgIndex} className="animate-[fadeSlideUp_0.4s_ease]">
                  {GENERATION_MESSAGES[msgIndex]}
                </span>
              )}
              {isDone && "Semaine du 3 au 7 mars 2026"}
            </p>
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-2.5">
            {isGenerating && (
              <button
                onClick={cancel}
                className="rounded-xl border border-[var(--color-border)] bg-white px-5 py-2.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[#f5f5f5]"
              >
                Annuler
              </button>
            )}
            {(isIdle || isDone) && (
              <button
                onClick={isDone ? reset : startGeneration}
                className="rounded-xl bg-[var(--color-primary)] px-7 py-3 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(196,96,45,0.3)] transition-all hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] hover:shadow-[0_8px_24px_rgba(196,96,45,0.35)] active:translate-y-0"
              >
                {isDone ? "↺ Regénérer" : "✨ Générer ma semaine"}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isGenerating && (
          <div className="mt-5 animate-[fadeSlideUp_0.3s_ease]">
            <ProgressBar current={revealed} total={SAMPLE_RECIPES.length} />
          </div>
        )}
      </div>

      {/* Grid recettes */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {isIdle &&
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-white"
            >
              <span className="text-[28px] opacity-40">🍽</span>
              <span className="text-[13px] text-[var(--color-text-muted)]">
                Recette {i + 1}
              </span>
            </div>
          ))}

        {(isGenerating || isDone) &&
          SAMPLE_RECIPES.map((recipe, i) =>
            i < revealed ? (
              <RecipeCard key={i} recipe={recipe} visible />
            ) : (
              <SkeletonCard key={i} />
            ),
          )}
      </div>

      {/* Barre d'action success */}
      {isDone && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-5 animate-[fadeSlideUp_0.5s_ease]">
          <div>
            <p className="mb-1 font-[family-name:var(--font-playfair)] text-base font-semibold text-[var(--color-text)]">
              Prêt·e à cuisiner?
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Génère ta liste d'épicerie ou explore les recettes.
            </p>
          </div>
          <div className="flex gap-2.5">
            <button className="rounded-xl bg-[#f5f1eb] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[#ede8e1]">
              📋 Liste d'épicerie
            </button>
            <button className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]">
              Voir les recettes →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

**Step 3: Ajouter les keyframes manquantes dans globals.css**

Dans `app/globals.css`, ajouter après le bloc `@theme inline` :

```css
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Step 4: Build check**

```bash
pnpm build
```
Expected: build sans erreur.

**Step 5: Commit**

```bash
git add app/(app)/generate/page.tsx src/components/generate/sampleData.ts app/globals.css
git commit -m "feat(generate): implement generate page with idle/generating/success states"
```

---

## Checklist finale

- [ ] `pnpm build` passe sans erreur
- [ ] Nav : sticky, fond blanc, logo 🍳 + Playfair, lien actif terra cotta
- [ ] Idle : 5 placeholders pointillés avec 🍽
- [ ] Generating : progress bar + messages rotatifs + skeletons → cards une à une
- [ ] Success : toutes les cards + barre d'action
- [ ] Pas de régression sur les autres routes

# Design System Little Chef Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Formaliser le système de styling Little Chef — tokens CSS complets, font Lato, skeleton propre, hover CSS pur, DESIGN_SYSTEM.md.

**Architecture:** Compléter le `@theme inline` dans `globals.css`, remplacer Geist par Lato via `next/font`, tokeniser les grays hardcodés du SkeletonCard, supprimer le hover JS de RecipesCard, documenter le tout dans `DESIGN_SYSTEM.md`.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, `next/font/google`, CSS custom properties.

---

## Pré-requis : créer le worktree

```bash
git worktree add .worktrees/stu-204 -b feat/stu-204-design-system
cd .worktrees/stu-204
```

Toute la suite se fait dans ce worktree.

---

### Task 1 : Compléter les tokens CSS dans `globals.css`

**Files:**
- Modify: `app/globals.css`

**Step 1 : Ajouter les tokens manquants dans `@theme inline`**

Dans [app/globals.css](app/globals.css), ajouter après `--color-border` :

```css
@theme inline {
  /* Couleurs Little Chef */
  --color-background: #FAF7F2;
  --color-primary: #C4602D;
  --color-primary-hover: #A84E24;
  --color-secondary: #7A9E7E;
  --color-text: #3B2A1A;
  --color-text-muted: #7A6A5A;
  --color-border: #E8E0D5;

  /* Nouveaux tokens — surfaces */
  --color-bg-surface: #ffffff;
  --color-bg-muted: #f5f1eb;
  --color-border-dashed: #E8E0D5;

  /* Nouveaux tokens — skeleton */
  --color-skeleton: #f0f0f0;
  --color-skeleton-shine: #f8f8f8;

  /* Fonts */
  --font-sans: var(--font-lato);
  --font-serif: var(--font-playfair);
}
```

**Step 2 : Ajouter l'animation `shimmer` (absente)**

Après les `@keyframes` existants, ajouter :

```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
```

**Step 3 : Vérifier que le build passe**

```bash
pnpm build
```

Expected: aucune erreur TypeScript ni CSS.

**Step 4 : Commit**

```bash
git add app/globals.css
git commit -m "style(ui): add missing CSS tokens and shimmer animation"
```

---

### Task 2 : Remplacer Geist par Lato dans `layout.tsx`

**Files:**
- Modify: `app/layout.tsx`

**Step 1 : Mettre à jour les imports font**

Remplacer le contenu de [app/layout.tsx](app/layout.tsx) :

```tsx
import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
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
      <body className={`${lato.variable} ${playfairDisplay.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

**Step 2 : Vérifier le build**

```bash
pnpm build
```

Expected: aucune erreur. Lato chargé via next/font (pas @import direct).

**Step 3 : Commit**

```bash
git add app/layout.tsx
git commit -m "style(ui): replace Geist with Lato via next/font"
```

---

### Task 3 : Tokeniser `SkeletonCard` + animation shimmer

**Files:**
- Modify: `src/components/generate/SkeletonCard.tsx`

**Step 1 : Réécrire le composant avec vars CSS et shimmer**

Remplacer le contenu de [src/components/generate/SkeletonCard.tsx](src/components/generate/SkeletonCard.tsx) :

```tsx
export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* Zone image skeleton — shimmer */}
      <div
        className="h-40 animate-[shimmer_1.5s_infinite]"
        style={{
          background: `linear-gradient(90deg, var(--color-skeleton) 25%, var(--color-skeleton-shine) 50%, var(--color-skeleton) 75%)`,
          backgroundSize: "200% 100%",
        }}
      />
      {/* Zone contenu skeleton */}
      <div className="p-4">
        <div className="mb-2 h-[18px] w-4/5 animate-[shimmer_1.5s_infinite] rounded-md"
          style={{
            background: `linear-gradient(90deg, var(--color-skeleton) 25%, var(--color-skeleton-shine) 50%, var(--color-skeleton) 75%)`,
            backgroundSize: "200% 100%",
          }}
        />
        <div className="mb-4 h-3.5 w-3/5 animate-[shimmer_1.5s_infinite] rounded-md"
          style={{
            background: `linear-gradient(90deg, var(--color-skeleton) 25%, var(--color-skeleton-shine) 50%, var(--color-skeleton) 75%)`,
            backgroundSize: "200% 100%",
          }}
        />
        <div className="flex gap-2">
          <div className="h-6 w-[70px] animate-[shimmer_1.5s_infinite] rounded-full"
            style={{
              background: `linear-gradient(90deg, var(--color-skeleton) 25%, var(--color-skeleton-shine) 50%, var(--color-skeleton) 75%)`,
              backgroundSize: "200% 100%",
            }}
          />
          <div className="h-6 w-[55px] animate-[shimmer_1.5s_infinite] rounded-full"
            style={{
              background: `linear-gradient(90deg, var(--color-skeleton) 25%, var(--color-skeleton-shine) 50%, var(--color-skeleton) 75%)`,
              backgroundSize: "200% 100%",
            }}
          />
        </div>
      </div>
    </div>
  );
}
```

Note : le `backgroundSize: "200% 100%"` est obligatoire pour que l'animation shimmer fonctionne. C'est un inline style technique, pas une magic string à tokeniser.

**Step 2 : Vérifier le build**

```bash
pnpm build
```

Expected: aucune erreur.

**Step 3 : Commit**

```bash
git add src/components/generate/SkeletonCard.tsx
git commit -m "style(ui): tokenise skeleton colors and use shimmer animation"
```

---

### Task 4 : Hover CSS pur dans `RecipesCard`

**Files:**
- Modify: `src/components/recipes/RecipesCard.tsx`

**Step 1 : Supprimer le useState hover, passer au CSS**

Dans [src/components/recipes/RecipesCard.tsx](src/components/recipes/RecipesCard.tsx) :

1. Supprimer `const [hovered, setHovered] = useState(false);`
2. Supprimer `onMouseEnter` et `onMouseLeave` du div principal
3. Remplacer les inline styles JS par des classes Tailwind

Le div principal devient :

```tsx
<div
  onClick={() => onOpen(recipe)}
  className="relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:-translate-y-[3px]"
>
```

Supprimer l'import `useState` s'il n'est plus utilisé (vérifier si `isFav` l'utilise encore — oui, donc garder l'import).

**Step 2 : Vérifier le build**

```bash
pnpm build
```

Expected: aucune erreur TypeScript (pas d'unused imports).

**Step 3 : Commit**

```bash
git add src/components/recipes/RecipesCard.tsx
git commit -m "style(ui): replace JS hover state with CSS hover in RecipesCard"
```

---

### Task 5 : Créer `DESIGN_SYSTEM.md`

**Files:**
- Create: `DESIGN_SYSTEM.md`

**Step 1 : Créer le fichier à la racine**

Créer [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) avec le contenu suivant :

```markdown
# Design System — Little Chef

**Références :** Mealime (chaleur organique, fond ivoire) + Chefs Plate (cards structurées, badges)
**Ton :** Chaleureux, rassurant, pas technologique. ND-friendly — hiérarchie claire, pas d'overload visuel.

---

## Palette

Définie dans `app/globals.css` via `@theme inline`.

| Token | Valeur | Usage |
|-------|--------|-------|
| `--color-background` | `#FAF7F2` | Fond global |
| `--color-bg-surface` | `#ffffff` | Cards, header |
| `--color-bg-muted` | `#f5f1eb` | Surfaces secondaires, ghost button |
| `--color-primary` | `#C4602D` | CTA, accents, liens |
| `--color-primary-hover` | `#A84E24` | Hover CTA |
| `--color-secondary` | `#7A9E7E` | Gradient progress, accents doux |
| `--color-text` | `#3B2A1A` | Texte principal |
| `--color-text-muted` | `#7A6A5A` | Métadonnées, sous-titres |
| `--color-border` | `#E8E0D5` | Séparateurs, bordures |
| `--color-border-dashed` | `#E8E0D5` | Placeholders idle |
| `--color-skeleton` | `#f0f0f0` | Base skeleton shimmer |
| `--color-skeleton-shine` | `#f8f8f8` | Éclat skeleton shimmer |

---

## Typographie

Chargée via `next/font/google` dans `app/layout.tsx`.

| Variable | Font | Usage |
|----------|------|-------|
| `--font-sans` → `--font-lato` | Lato (300, 400, 600, 700) | Corps, navigation, tags |
| `--font-serif` → `--font-playfair` | Playfair Display (400, 600, 700) | Titres, noms de recettes |

### Hiérarchie

| Élément | Font | Taille | Poids |
|---------|------|--------|-------|
| H1 page | Playfair Display | 32px | 700 |
| Nom recette (card) | Playfair Display | 15px | 700 |
| Sous-titre page | Lato | 14px | 400 |
| Description recette | Lato | 13px | 400 |
| Tags / badges | Lato | 11–12px | 600 |
| Navigation | Lato | 14px | 400 / 700 |
| Métadonnées (⏱ 🔥) | Lato | 11px | 600 |

En Tailwind : `font-[family-name:var(--font-playfair)]` pour le serif.

---

## Composants

### `Button` — `src/components/ui/Button.tsx`

| Variant | Usage |
|---------|-------|
| `primary` | CTA principal (générer, confirmer) |
| `outline` | Actions secondaires (annuler) |
| `ghost` | Navigation douce (liste d'épicerie) |
| `icon` | Icône seule (favori) |

Sizes : `sm`, `md`, `lg`.

### `RecipeCard` — `src/components/generate/RecipeCard.tsx`

Card recette affichée pendant et après la génération.
- Zone emoji : `h-40`, fond gradient par recette (`color` + `accent`)
- Reveal : `cubic-bezier(0.34, 1.56, 0.64, 1)` — léger overshoot
- Badges temps/kcal : pills `bg-white/90` en overlay bas-droite

### `SkeletonCard` — `src/components/generate/SkeletonCard.tsx`

Placeholder animé pendant la génération. Même structure que `RecipeCard` pour éviter le layout shift.
- Animation `shimmer` (définie dans `globals.css`)
- Couleurs via tokens `--color-skeleton` / `--color-skeleton-shine`

### `ProgressBar` — `src/components/generate/ProgressBar.tsx`

- Track : `h-1.5`, `bg-[var(--color-border)]`
- Fill : gradient `--color-secondary → --color-primary`, transition 500ms

### `RecipesCard` — `src/components/recipes/RecipesCard.tsx`

Card recette en vue `/recipes`.
- Hover : CSS pur via Tailwind (`hover:-translate-y-[3px] hover:shadow-[...]`)
- Bouton favori ♡ / ♥ en overlay haut-droite

### `PageLayout` — `src/components/ui/PageLayout.tsx`

Layout commun à toutes les vues.
- Max-width : `860px`, centré
- Header sticky avec slot `headerAction`

---

## Animations

Toutes définies dans `app/globals.css`.

| Nom | Usage |
|-----|-------|
| `fadeSlideUp` | Apparition page, bandeaux de succès |
| `fadeIn` | Apparition douce |
| `slideUp` | Entrée depuis le bas |
| `spin` | Indicateur de chargement (⟳) |
| `shimmer` | Skeleton loader |

---

## Layout

- **Max-width :** `860px`, centré, `padding: 40px 24px 80px`
- **Grid recettes :** `repeat(auto-fill, minmax(240px, 1fr))`, `gap: 18px`
- **Header :** sticky, `h-16`, `border-b border-[var(--color-border)]`

---

## Règles ND-friendly

- Pas de formulaire massif d'un coup — une question à la fois (onboarding)
- Feedback visuel clair à chaque étape (SSE, ProgressBar)
- Hiérarchie forte : un seul H1 par page, sous-titre Lato/14px
- États de chargement explicites : skeleton avant le contenu, jamais de vide non expliqué
- Pas de mur de texte : max 2 lignes de description par card
```

**Step 2 : Vérifier le build**

```bash
pnpm build
```

Expected: aucune erreur (le `.md` n'affecte pas le build).

**Step 3 : Commit**

```bash
git add DESIGN_SYSTEM.md
git commit -m "docs: add DESIGN_SYSTEM.md with full Little Chef styling reference"
```

---

### Task 6 : Build final + PR

**Step 1 : Build de validation**

```bash
pnpm build
```

Expected: ✓ Compiled successfully, 0 errors.

**Step 2 : Push + PR**

```bash
git push -u origin feat/stu-204-design-system
gh pr create \
  --title "style(ui): STU-204 — Design system tokens, Lato, skeleton shimmer, DESIGN_SYSTEM.md" \
  --body "$(cat <<'EOF'
## Résumé

- Complète les tokens CSS manquants dans `globals.css` (`bg-surface`, `bg-muted`, `skeleton`, `skeleton-shine`)
- Remplace Geist par **Lato** (300/400/600/700) via `next/font`
- `SkeletonCard` : couleurs tokenisées + animation `shimmer` (vs `animate-pulse`)
- `RecipesCard` : supprime le useState hover → CSS pur (`hover:-translate-y-[3px]`)
- Crée `DESIGN_SYSTEM.md` — référence complète palette, typo, composants, animations

## Test plan

- [ ] `pnpm build` passe sans erreur
- [ ] Visuellement : skeleton shimmer visible sur `/generate` pendant la génération
- [ ] Hover card sur `/recipes` : translate + shadow correct
- [ ] Lato chargée (inspecter via DevTools > Network > Fonts)
- [ ] Pas de layout shift skeleton → card reveal

Closes STU-204
EOF
)" \
  --base main
```

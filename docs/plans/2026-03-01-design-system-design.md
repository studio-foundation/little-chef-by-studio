# Design System Little Chef — STU-204

**Date :** 2026-03-01
**Ticket :** [STU-204](https://linear.app/studioag/issue/STU-204)
**Approche retenue :** B — Tokens + doc + nettoyage skeleton

---

## Contexte

Formaliser et documenter le système de styling Little Chef pour garantir la cohérence visuelle à travers toutes les vues. Le code partiel existe (palette partielle dans `globals.css`, composants extraits), mais les tokens sont incomplets, Lato n'est pas chargé, et `DESIGN_SYSTEM.md` n'existe pas.

---

## Décisions prises

- **Palette :** Terra cotta (actuelle) — `--color-primary: #C4602D`. Pas de migration vers le vert de la spec.
- **Body font :** Lato (spec STU-204) — remplace Geist.
- **Scope :** Tokens + doc + skeleton propre + hover CSS pur sur RecipesCard. Pas de refactor complet des inline styles (scope C).

---

## Plan d'implémentation

### 1. `globals.css` — compléter les tokens

Ajouter dans `@theme inline` :

```css
/* Surfaces */
--color-bg-surface:     #ffffff;
--color-bg-muted:       #f5f1eb;
--color-border-dashed:  #E8E0D5;

/* Skeleton */
--color-skeleton:       #f0f0f0;
--color-skeleton-shine: #f8f8f8;
```

Ajouter animation manquante :

```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
```

### 2. `layout.tsx` — remplacer Geist par Lato

```tsx
import { Lato } from "next/font/google";

const lato = Lato({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});
```

Supprimer l'import Geist. Mettre à jour le `className` du `<body>`.

### 3. `SkeletonCard.tsx` — tokeniser + shimmer

- Zone image : passer de `animate-pulse bg-gradient-to-r from-[#f0f0f0] via-[#f8f8f8] to-[#f0f0f0]` à une animation `shimmer` utilisant les vars CSS.
- Barres de contenu : remplacer `bg-[#f0f0f0]` par `bg-[var(--color-skeleton)]`.

### 4. `RecipesCard.tsx` — hover CSS pur

- Supprimer `useState` pour `hovered`.
- Supprimer `onMouseEnter` / `onMouseLeave`.
- Remplacer les inline styles JS par des classes Tailwind :
  - `hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]`
  - `hover:-translate-y-[3px]`
  - `shadow-[0_2px_12px_rgba(0,0,0,0.06)]` (état par défaut)

### 5. `DESIGN_SYSTEM.md` à la racine

Document de référence complet couvrant palette, typographie, composants, animations, layout, règles ND-friendly.

---

## Fichiers touchés

| Fichier | Changement |
|---------|-----------|
| `app/globals.css` | +5 tokens, +1 animation shimmer |
| `app/layout.tsx` | Geist → Lato |
| `src/components/generate/SkeletonCard.tsx` | Vars CSS + shimmer |
| `src/components/recipes/RecipesCard.tsx` | Hover CSS pur (retire useState) |
| `DESIGN_SYSTEM.md` | Création |

---

## Critères d'acceptation (STU-204)

- [x] Variables CSS complètes dans `globals.css`
- [x] Fonts via `next/font` (Lato + Playfair)
- [x] Composants dans `components/` (déjà fait)
- [x] `DESIGN_SYSTEM.md` à la racine
- [x] Animations dans `globals.css` (shimmer ajouté)
- [x] Pas de layout shift skeleton → card (structure identique maintenue)

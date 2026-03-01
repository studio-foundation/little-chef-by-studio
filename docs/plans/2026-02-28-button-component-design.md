# Design — Composant Button réutilisable

**Date :** 2026-02-28
**Statut :** Approuvé

## Contexte

Le codebase contient 4 patterns de boutons dupliqués à travers plusieurs pages et composants (`generate/page.tsx`, `recipes/RecipeDetail.tsx`, `recipes/RecipesCard.tsx`). Ce composant consolide ces patterns en une API unique.

## API

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "icon"
  size?: "sm" | "md" | "lg"
  isLoading?: boolean
  asChild?: boolean
}
```

- `variant` — défaut `"primary"`
- `size` — défaut `"md"` ; ignoré pour `"icon"` (toujours carré fixe)
- `isLoading` — affiche un spinner inline, désactive le bouton, préserve la largeur
- `asChild` — injecte les props sur l'enfant unique (Slot maison, sans dépendance Radix)

## Variants visuels

| Variant | Fond | Texte | Border | Hover |
|---|---|---|---|---|
| `primary` | `--color-primary` | blanc | — | `--color-primary-hover` + lift (-0.5px) + ombre |
| `outline` | blanc | `--color-text-muted` | `--color-border` | `#f5f5f5` |
| `ghost` | `#f5f1eb` (ivoire) | `--color-primary` | — | `#ede8e1` |
| `icon` | `rgba(255,255,255,0.85)` | hérite du parent | — | blanc plein + scale 110 |

## Sizes

| Size | Padding | Font |
|---|---|---|
| `sm` | `px-5 py-2.5` | `text-sm` |
| `md` | `px-6 py-3` | `text-sm font-semibold` |
| `lg` | `px-7 py-3` | `text-[15px] font-bold` + ombre primary |

`icon` ignore `size` et utilise `h-9 w-9` (36px carré).

## Fichiers à créer/modifier

- **Créer** `src/components/ui/Button.tsx` — composant + Slot maison
- **Créer** `src/components/ui/index.ts` — barrel export
- **Modifier** `app/(app)/generate/page.tsx` — remplacer les `<button>` inline
- **Modifier** `src/components/recipes/RecipeDetail.tsx` — remplacer les `<button>` inline
- **Modifier** `src/components/recipes/RecipesCard.tsx` — remplacer le bouton favori

## Décisions

- **Pas de CVA** — pas de dépendance supplémentaire pour un seul composant
- **Pas de composants séparés** — un seul composant, API claire via `variant`
- **Slot maison** — 10 lignes pour supporter `asChild` sans Radix
- **Spinner** — `animate-[spin_1s_linear_infinite]` déjà défini dans globals.css

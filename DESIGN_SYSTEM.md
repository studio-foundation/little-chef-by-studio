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
| `--font-sans` → `--font-lato` | Lato (300, 400, 700) | Corps, navigation, tags |
| `--font-serif` → `--font-playfair` | Playfair Display (400, 600, 700) | Titres, noms de recettes |

### Hiérarchie

| Élément | Font | Taille | Poids |
|---------|------|--------|-------|
| H1 page | Playfair Display | 32px | 700 |
| Nom recette (card) | Playfair Display | 15px | 700 |
| Sous-titre page | Lato | 14px | 400 |
| Description recette | Lato | 13px | 400 |
| Tags / badges | Lato | 11–12px | 700 |
| Navigation | Lato | 14px | 400 / 700 |
| Métadonnées (⏱ 🔥) | Lato | 11px | 700 |

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

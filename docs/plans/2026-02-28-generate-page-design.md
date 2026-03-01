# Design — Page /generate

**Date :** 2026-02-28
**Scope :** Transformer la page `/generate` pour qu'elle ressemble à la maquette `LittleChefGeneration`, en adaptant au design system existant du projet.

## Décisions

- **Couleurs :** Design system existant — terra cotta `#C4602D` comme primaire, vert sauge `#7A9E7E` comme secondaire
- **Header :** Refonte du composant `Nav` existant avec le styling de la maquette (sticky, blanc, Playfair Display)
- **Styles :** Tailwind v4 (pas d'inline styles)
- **Architecture :** Client Component + sous-composants séparés

## Fichiers

| Fichier | Action |
|---------|--------|
| `src/components/nav.tsx` | Refonte du styling |
| `app/(app)/generate/page.tsx` | Réécriture complète |
| `src/components/generate/RecipeCard.tsx` | Nouveau |
| `src/components/generate/SkeletonCard.tsx` | Nouveau |
| `src/components/generate/ProgressBar.tsx` | Nouveau |

## États de la page

### Idle
- Titre "Ma semaine", sous-titre "5 repas générés selon tes préférences"
- Grid 5 placeholder cards (bordure pointillée, 🍽 + "Recette N")
- Bouton "✨ Générer ma semaine" en terra cotta

### Generating
- Sous-titre animé avec messages rotatifs (7 messages, toutes les 1800ms)
- Progress bar "X/5 recettes générées"
- Cards révélées une à une toutes les 1400ms (skeleton → RecipeCard avec animation)
- Bouton "Annuler"

### Success
- Titre "Ta semaine est prête 🎉" + date de la semaine
- 5 RecipeCards visibles
- Barre d'action : "📋 Liste d'épicerie" + "Voir les recettes →"
- Bouton "↺ Regénérer"

## Composants

### RecipeCard
- Zone couleur top (dégradé par recette) + emoji centré + badges ⏱ temps / 🔥 kcal
- Corps : nom en Playfair Display, description en gris, tags colorés (badge pill)
- Animation bounce-in à l'apparition (`translateY + scale`)

### SkeletonCard
- Même dimensions que RecipeCard
- Shimmer animation sur fond gris clair

### ProgressBar
- "X recettes générées" à gauche, "X/5" en terra cotta à droite
- Barre de progression avec dégradé terra cotta, transition CSS fluide

## Nav — Nouveau styling
- `position: sticky`, `top: 0`, `z-index: 10`, fond blanc, bordure bottom
- Logo : 🍳 + "little chef" en Playfair Display, couleur terra cotta
- Liens : gris par défaut, actif = terra cotta + underline bottom 2px
- Détection du lien actif via `usePathname()`

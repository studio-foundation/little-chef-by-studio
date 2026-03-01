# Design — Page /recipes

**Date :** 2026-02-28
**Scope :** Transformer la page `/recipes` pour qu'elle ressemble à la maquette `LittleChefRecipes.jsx`.

## Décisions

- **Couleurs :** Design system existant — terra cotta `#C4602D` comme primaire
- **Favoris :** UI-only (état local, pas de persistance DB)
- **Régénérer :** UI-only (spinner 2s, pas d'appel API)
- **Architecture :** Option A — composants séparés dans `src/components/recipes/`

## Fichiers

| Fichier | Action |
|---------|--------|
| `src/components/generate/types.ts` | Extension avec champs optionnels |
| `src/components/generate/sampleData.ts` | Ajout données complètes (nutrition, ingrédients, étapes) |
| `src/components/recipes/RecipesCard.tsx` | Nouveau |
| `src/components/recipes/RecipeDetail.tsx` | Nouveau |
| `app/(app)/recipes/page.tsx` | Réécriture |
| `app/globals.css` | Ajout keyframes slideUp + fadeIn |

## Type Recipe — Extensions

Champs optionnels ajoutés (ne cassent pas `/generate`) :

```ts
protein?: string        // "18g"
carbs?: string          // "58g"
fat?: string            // "16g"
portions?: number       // 2
description?: string    // texte long de la recette
ingredients?: { qty: string; name: string }[]
steps?: string[]
```

## RecipesCard

- Fond blanc, `rounded-2xl`, `overflow-hidden`, ombre légère
- **Zone image (h-40)** : dégradé `recipe.color → recipe.accent + "22"` à 135deg, emoji 52px centré
  - Badges ⏱ temps + 🔥 kcal : bas gauche, `bg-white/90`, `rounded-full`
  - Bouton ♡/♥ : haut droite, `bg-white/90`, toggle local `isFav`
- **Hover** : `translateY(-3px)` + ombre plus profonde (via inline style + onMouseEnter/Leave)
- **Corps** : nom Playfair 15px bold, `description` courte (12px gris), 2 premiers tags pills
- **Clic** → appelle `onOpen(recipe)`

## RecipeDetail (modal bottom-sheet)

### Structure
- Backdrop : `fixed inset-0`, `bg-black/40`, `backdrop-blur-sm`, clic ferme
- Drawer : `fixed bottom-0 left-0 right-0`, centré, `maxWidth: 680px`, `rounded-[24px_24px_0_0]`, `maxHeight: 92vh`, `overflow-y: auto`, fond `--color-background`

### Animations
- Backdrop : `@keyframes fadeIn` (opacity 0→1, 0.2s)
- Drawer : `@keyframes slideUp` (translateY(40px)+opacity 0 → translateY(0)+opacity 1, 0.35s cubic-bezier(0.34, 1.2, 0.64, 1))

### Contenu
1. **Hero (200px)** : dégradé couleur, emoji 72px centré, bouton X (haut droite), tags (bas gauche)
2. **Titre + meta** : h2 Playfair, `description`, méta inline (⏱ / 🤜 portions / 🔥 kcal)
3. **Nutrition pills (3)** : Protéines / Glucides / Lipides — fond coloré `color + "22"`, valeur en Playfair bold, label en gris
4. **Ingrédients** : liste, `name` gauche + `qty` droite, `border-bottom` entre chaque
5. **Étapes** : cercle numéroté (`recipe.color`/`recipe.accent`) + texte 15px
6. **Boutons** : "↺ Régénérer" (outline, état `regenerating` 2s + spinner) + "⭐ Sauvegarder" (terra cotta)

## Page /recipes

- Titre "Mes recettes" + subtitle "Semaine du 3 au 7 mars · 5 repas · Cliquer pour les détails"
- Bouton "📋 Liste d'épicerie" (terra cotta)
- State : `selected: Recipe | null`, `regenIds: Set<number>`
- Grille `repeat(auto-fill, minmax(240px, 1fr))`, gap 18px
- Overlay sur la card en cours de régénération (spinner + "Génération…", backdrop blur léger)
- Modal `RecipeDetail` rendu conditionnellement

## Keyframes à ajouter dans globals.css

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(40px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

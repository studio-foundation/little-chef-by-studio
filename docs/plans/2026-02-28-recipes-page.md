# Recipes Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformer la page `/recipes` pour qu'elle reproduise la maquette `LittleChefRecipes.jsx` — grille de cards avec hover/favori, et un modal bottom-sheet détail par recette.

**Architecture:** Client Components séparés dans `src/components/recipes/`. Le type `Recipe` est étendu avec des champs optionnels pour ne pas casser `/generate`. La page orchestre l'état modal + régénération.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, CSS variables existantes.

**No test setup** in this project — focus on implementation + `pnpm build` verification.

---

## Design Reference

Maquette : `LittleChefRecipes.jsx` (document fourni par l'utilisateur).

Palette projet :
- `--color-primary: #C4602D` (terra cotta) → remplace `#4a7c59` de la maquette
- `--color-primary-hover: #A84E24`
- `--color-background: #FAF7F2` (ivoire)
- `--color-border: #E8E0D5`
- `--color-text: #3B2A1A`
- `--color-text-muted: #7A6A5A`

---

### Task 1: Étendre le type Recipe + enrichir sampleData

**Files:**
- Modify: `src/components/generate/types.ts`
- Modify: `src/components/generate/sampleData.ts`

**Context:** Le type `Recipe` actuel n'a que les champs utilisés sur `/generate`. La page `/recipes` a besoin de données supplémentaires (nutrition, ingrédients, étapes). On ajoute des champs **optionnels** pour ne pas casser le code existant.

**Step 1: Mettre à jour types.ts**

Remplacer le contenu de `src/components/generate/types.ts` par :

```ts
export interface Recipe {
  name: string;
  time: string;
  kcal: string;
  tags: string[];
  emoji: string;
  color: string;   // light background color, e.g. "#FFF3E0"
  accent: string;  // vivid accent color, e.g. "#FF9800"
  desc: string;
  // Extended fields for /recipes page
  id?: number;
  description?: string;
  portions?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
  ingredients?: { qty: string; name: string }[];
  steps?: string[];
}
```

**Step 2: Enrichir sampleData.ts**

Remplacer le contenu de `src/components/generate/sampleData.ts` par :

```ts
import type { Recipe } from "./types";

export const SAMPLE_RECIPES: Recipe[] = [
  {
    id: 1,
    name: "Bol de quinoa aux légumes rôtis",
    time: "25 min",
    kcal: "480 kcal",
    tags: ["Végétarien", "Sans gluten", "Facile"],
    emoji: "🥗",
    color: "#E8F5E9",
    accent: "#4CAF50",
    desc: "Quinoa, courge butternut, poivrons, tahini citronné",
    description: "Savoureux, coloré et rassasiant — idéal en semaine.",
    portions: 2,
    protein: "18g",
    carbs: "58g",
    fat: "16g",
    ingredients: [
      { qty: "180g", name: "quinoa blanc" },
      { qty: "300g", name: "courge butternut, en cubes" },
      { qty: "2", name: "poivrons (rouge + jaune)" },
      { qty: "1 boîte", name: "pois chiches égouttés" },
      { qty: "3 c. à soupe", name: "tahini" },
      { qty: "1", name: "citron, jus" },
      { qty: "2 c. à soupe", name: "huile d'olive" },
      { qty: "Sel, poivre", name: "au goût" },
    ],
    steps: [
      "Préchauffer le four à 200 °C. Disposer la courge et les poivrons sur une plaque, arroser d'huile, saler. Rôtir 20 min.",
      "Rincer le quinoa. Cuire dans 360 ml d'eau bouillante salée, couvrir et réduire à feu doux 15 min. Retirer du feu, laisser gonfler 5 min.",
      "Mélanger tahini, jus de citron, 2 c. à soupe d'eau et une pincée de sel pour la vinaigrette.",
      "Assembler : quinoa au fond, légumes rôtis, pois chiches. Arroser de vinaigrette tahini.",
    ],
  },
  {
    id: 2,
    name: "Saumon teriyaki au riz jasmin",
    time: "20 min",
    kcal: "560 kcal",
    tags: ["Sans gluten", "Rapide", "Protéines"],
    emoji: "🐟",
    color: "#FFF3E0",
    accent: "#FF9800",
    desc: "Filet de saumon, riz jasmin, brocoli, sauce teriyaki maison",
    description: "Un classique rapide avec une sauce maison en 5 minutes.",
    portions: 2,
    protein: "38g",
    carbs: "52g",
    fat: "14g",
    ingredients: [
      { qty: "2 filets", name: "saumon (150g chacun)" },
      { qty: "200g", name: "riz jasmin" },
      { qty: "200g", name: "brocoli en fleurons" },
      { qty: "3 c. à soupe", name: "sauce soja" },
      { qty: "2 c. à soupe", name: "mirin" },
      { qty: "1 c. à soupe", name: "miel" },
      { qty: "1 gousse", name: "ail émincé" },
      { qty: "Graines de sésame", name: "pour servir" },
    ],
    steps: [
      "Cuire le riz jasmin selon les instructions. Cuire le brocoli à la vapeur 5 min.",
      "Mélanger sauce soja, mirin, miel et ail pour la sauce teriyaki.",
      "Chauffer une poêle à feu vif. Saisir le saumon côté peau 3 min, retourner 2 min.",
      "Ajouter la sauce, enrober le saumon et laisser caraméliser 1 min. Servir sur le riz avec le brocoli.",
    ],
  },
  {
    id: 3,
    name: "Pasta e fagioli",
    time: "35 min",
    kcal: "420 kcal",
    tags: ["Végétarien", "Confort", "Batch cook"],
    emoji: "🍝",
    color: "#FCE4EC",
    accent: "#E91E63",
    desc: "Haricots borlotti, petites pâtes, tomates, romarin",
    description: "Le réconfort italien en un bol — simple, profond, nourrissant.",
    portions: 4,
    protein: "16g",
    carbs: "68g",
    fat: "8g",
    ingredients: [
      { qty: "1 boîte", name: "haricots borlotti" },
      { qty: "200g", name: "ditalini ou petites pâtes" },
      { qty: "400g", name: "tomates concassées" },
      { qty: "1L", name: "bouillon de légumes" },
      { qty: "1", name: "oignon émincé" },
      { qty: "3 gousses", name: "ail" },
      { qty: "1 brin", name: "romarin frais" },
      { qty: "Parmesan râpé", name: "pour servir" },
    ],
    steps: [
      "Faire revenir l'oignon et l'ail dans l'huile d'olive 5 min à feu moyen.",
      "Ajouter romarin, tomates concassées et bouillon. Laisser mijoter 10 min.",
      "Incorporer les haricots. Écraser grossièrement 1/3 avec une fourchette pour épaissir.",
      "Ajouter les pâtes et cuire selon le temps indiqué. Ajuster sel et poivre. Servir avec parmesan.",
    ],
  },
  {
    id: 4,
    name: "Poulet miso aux champignons",
    time: "30 min",
    kcal: "510 kcal",
    tags: ["Sans gluten", "Umami", "Protéines"],
    emoji: "🍗",
    color: "#F3E5F5",
    accent: "#9C27B0",
    desc: "Cuisse de poulet, shiitakes, pâte miso blanche, gingembre",
    description: "Umami profond, cuisson en une seule poêle.",
    portions: 2,
    protein: "42g",
    carbs: "18g",
    fat: "28g",
    ingredients: [
      { qty: "2", name: "cuisses de poulet désossées" },
      { qty: "200g", name: "shiitakes (ou champignons mélangés)" },
      { qty: "2 c. à soupe", name: "pâte miso blanche" },
      { qty: "1 c. à soupe", name: "sauce soja" },
      { qty: "1 c. à café", name: "gingembre frais râpé" },
      { qty: "2 c. à soupe", name: "saké ou vin blanc" },
      { qty: "1 c. à soupe", name: "huile de sésame" },
      { qty: "Ciboulette", name: "pour servir" },
    ],
    steps: [
      "Mélanger miso, sauce soja, gingembre et saké. Badigeonner le poulet et mariner 10 min.",
      "Chauffer l'huile de sésame à feu moyen-vif. Saisir le poulet 6 min côté peau, retourner 4 min. Réserver.",
      "Dans la même poêle, sauter les champignons 5 min jusqu'à dorés.",
      "Remettre le poulet, ajouter 2 c. à soupe d'eau, couvrir 3 min. Servir avec ciboulette.",
    ],
  },
  {
    id: 5,
    name: "Tacos de lentilles épicées",
    time: "25 min",
    kcal: "390 kcal",
    tags: ["Végétalien", "Épicé", "Facile"],
    emoji: "🌮",
    color: "#FFF8E1",
    accent: "#FFC107",
    desc: "Lentilles beluga, avocat, salsa verde, crème de cajou",
    description: "Végétalien, rapide, et franchement meilleur que la version viande.",
    portions: 3,
    protein: "14g",
    carbs: "54g",
    fat: "12g",
    ingredients: [
      { qty: "250g", name: "lentilles beluga cuites" },
      { qty: "6", name: "tortillas de maïs" },
      { qty: "2", name: "avocats mûrs" },
      { qty: "200ml", name: "salsa verde (du commerce)" },
      { qty: "100ml", name: "crème de cajou" },
      { qty: "1 c. à café", name: "cumin" },
      { qty: "1 c. à café", name: "chili en poudre" },
      { qty: "Coriandre fraîche", name: "pour servir" },
    ],
    steps: [
      "Assaisonner les lentilles avec cumin, chili, sel et poivre. Réchauffer à la poêle 5 min.",
      "Écraser les avocats avec jus de citron vert et sel.",
      "Réchauffer les tortillas directement sur la flamme ou à sec 30 sec de chaque côté.",
      "Assembler : guacamole, lentilles, salsa verde, crème de cajou, coriandre.",
    ],
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

**Step 3: Build check**

```bash
pnpm build
```
Expected: aucune erreur TypeScript (les nouveaux champs sont optionnels).

**Step 4: Commit**

```bash
git add src/components/generate/types.ts src/components/generate/sampleData.ts
git commit -m "feat(recipes): extend Recipe type and enrich sample data with nutrition/ingredients/steps"
```

---

### Task 2: Ajouter keyframes dans globals.css

**Files:**
- Modify: `app/globals.css`

**Context:** La page `/recipes` utilise deux animations : `fadeIn` (backdrop du modal) et `slideUp` (drawer). Elles n'existent pas encore dans `globals.css`. `fadeSlideUp` est déjà présente pour `/generate`.

**Step 1: Ajouter les keyframes**

Dans `app/globals.css`, ajouter après le bloc `@keyframes fadeSlideUp { ... }` existant :

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(40px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**Step 2: Build check**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style(globals): add fadeIn, slideUp, spin keyframes for recipes page"
```

---

### Task 3: Créer RecipesCard

**Files:**
- Create: `src/components/recipes/RecipesCard.tsx`

**Context:** Card recette pour la page `/recipes`. Différente de `RecipeCard` dans `/generate` : elle a un effet hover (translateY), un bouton favori (♡/♥ toggle local), les badges temps/kcal en bas à gauche, et une `description` sous le nom. Le clic appelle `onOpen(recipe)`.

**Step 1: Créer le fichier**

```tsx
"use client";

import { useState } from "react";
import type { Recipe } from "@/src/components/generate/types";

interface RecipesCardProps {
  recipe: Recipe;
  onOpen: (recipe: Recipe) => void;
}

export function RecipesCard({ recipe, onOpen }: RecipesCardProps) {
  const [isFav, setIsFav] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onOpen(recipe)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative cursor-pointer overflow-hidden rounded-2xl bg-white transition-all duration-200"
      style={{
        boxShadow: hovered
          ? "0 8px 24px rgba(0,0,0,0.10)"
          : "0 2px 12px rgba(0,0,0,0.06)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
      }}
    >
      {/* Zone image */}
      <div
        className="relative flex h-40 items-center justify-center text-[52px]"
        style={{
          background: `linear-gradient(135deg, ${recipe.color} 0%, ${recipe.accent}22 100%)`,
        }}
      >
        {recipe.emoji}

        {/* Bouton favori */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFav(!isFav);
          }}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-[15px] transition-transform hover:scale-110"
        >
          {isFav ? "♥" : "♡"}
        </button>

        {/* Badges temps / kcal — bas gauche */}
        <div className="absolute bottom-2.5 left-2.5 flex gap-1.5">
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-muted)]">
            ⏱ {recipe.time}
          </span>
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-muted)]">
            🔥 {recipe.kcal}
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-4 pb-4 pt-3.5">
        <h3 className="mb-1.5 font-[family-name:var(--font-playfair)] text-[15px] font-bold leading-snug text-[var(--color-text)]">
          {recipe.name}
        </h3>
        {recipe.description && (
          <p className="mb-2.5 text-[12px] leading-snug text-[var(--color-text-muted)]">
            {recipe.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
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

**Step 2: Build check**

```bash
pnpm build
```

**Step 3: Commit**

```bash
git add src/components/recipes/RecipesCard.tsx
git commit -m "feat(recipes): add RecipesCard component with hover and fav toggle"
```

---

### Task 4: Créer RecipeDetail (modal bottom-sheet)

**Files:**
- Create: `src/components/recipes/RecipeDetail.tsx`

**Context:** Modal bottom-sheet qui s'ouvre au clic sur une RecipesCard. Backdrop avec blur + clic-outside pour fermer. Drawer qui slide up depuis le bas. Contenu : hero, titre+meta, nutrition pills, ingrédients, étapes, 2 boutons d'action. Le bouton "Régénérer" est UI-only avec spinner 2s. Couleurs de la maquette remplacées par le design system terra cotta.

**Step 1: Créer le fichier**

```tsx
"use client";

import { useState } from "react";
import type { Recipe } from "@/src/components/generate/types";

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
  onRegenerate: (id: number) => void;
}

function NutritionPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="flex-1 rounded-[10px] px-3.5 py-2.5 text-center"
      style={{ background: color + "22" }}
    >
      <div className="font-[family-name:var(--font-playfair)] text-base font-bold text-[var(--color-text)]">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
        {label}
      </div>
    </div>
  );
}

export function RecipeDetail({
  recipe,
  onClose,
  onRegenerate,
}: RecipeDetailProps) {
  const [regenerating, setRegenerating] = useState(false);

  const handleRegen = () => {
    if (regenerating || recipe.id === undefined) return;
    setRegenerating(true);
    onRegenerate(recipe.id);
    setTimeout(() => setRegenerating(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center animate-[fadeIn_0.2s_ease]"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full overflow-y-auto bg-[var(--color-background)] animate-[slideUp_0.35s_cubic-bezier(0.34,1.2,0.64,1)]"
        style={{
          maxWidth: "680px",
          maxHeight: "92vh",
          borderRadius: "24px 24px 0 0",
        }}
      >
        {/* Hero */}
        <div
          className="relative flex items-center justify-center text-[72px]"
          style={{
            height: "200px",
            background: `linear-gradient(135deg, ${recipe.color} 0%, ${recipe.accent}33 100%)`,
            borderRadius: "24px 24px 0 0",
          }}
        >
          {recipe.emoji}

          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-lg text-[var(--color-text-muted)] hover:bg-white"
          >
            ×
          </button>

          {/* Tags */}
          <div className="absolute bottom-3.5 left-5 flex gap-1.5">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                style={{
                  background: "rgba(255,255,255,0.88)",
                  color: recipe.accent,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="px-6 pb-10 pt-6">
          {/* Titre + meta */}
          <h2 className="mb-2 font-[family-name:var(--font-playfair)] text-2xl font-bold leading-tight text-[var(--color-text)]">
            {recipe.name}
          </h2>
          {recipe.description && (
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              {recipe.description}
            </p>
          )}
          <div className="mb-5 flex gap-4 text-[13px] text-[var(--color-text-muted)]">
            <span>⏱ {recipe.time}</span>
            {recipe.portions && <span>🤜 {recipe.portions} portions</span>}
            <span>🔥 {recipe.kcal}</span>
          </div>

          {/* Nutrition pills */}
          {recipe.protein && recipe.carbs && recipe.fat && (
            <div className="mb-7 flex gap-2">
              <NutritionPill label="Protéines" value={recipe.protein} color="#4CAF50" />
              <NutritionPill label="Glucides" value={recipe.carbs} color="#FF9800" />
              <NutritionPill label="Lipides" value={recipe.fat} color="#9C27B0" />
            </div>
          )}

          {/* Ingrédients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <>
              <h3 className="mb-3 font-[family-name:var(--font-playfair)] text-[17px] font-bold text-[var(--color-text)]">
                Ingrédients
              </h3>
              <ul className="mb-7 list-none p-0">
                {recipe.ingredients.map((ing, i) => (
                  <li
                    key={i}
                    className="flex justify-between border-b border-[var(--color-border)] py-2.5 text-sm"
                  >
                    <span className="text-[var(--color-text)]">{ing.name}</span>
                    <span className="font-semibold text-[var(--color-text-muted)]">
                      {ing.qty}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Étapes */}
          {recipe.steps && recipe.steps.length > 0 && (
            <>
              <h3 className="mb-4 font-[family-name:var(--font-playfair)] text-[17px] font-bold text-[var(--color-text)]">
                Préparation
              </h3>
              <ol className="mb-8 list-none p-0">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="mb-4 flex gap-3.5">
                    <span
                      className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                      style={{
                        background: recipe.color,
                        color: recipe.accent,
                      }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-[15px] leading-relaxed text-[#333]">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-2.5">
            <button
              onClick={handleRegen}
              disabled={regenerating}
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3.5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[#f5f1eb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {regenerating ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block animate-[spin_1s_linear_infinite]">⟳</span>
                  Génération…
                </span>
              ) : (
                "↺ Régénérer cette recette"
              )}
            </button>
            <button className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)]">
              ⭐ Sauvegarder
            </button>
          </div>
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
git add src/components/recipes/RecipeDetail.tsx
git commit -m "feat(recipes): add RecipeDetail modal bottom-sheet with nutrition, ingredients, steps"
```

---

### Task 5: Implémenter la page /recipes

**Files:**
- Modify: `app/(app)/recipes/page.tsx`

**Context:** Page client qui orchestre la grille de RecipesCard + le modal RecipeDetail. State : `selected` (recipe ouverte dans le modal) + `regenIds` (Set d'IDs en cours de régénération, pour l'overlay spinner sur la card). Le bouton "Liste d'épicerie" est un placeholder sans action pour l'instant.

**Step 1: Réécrire la page**

Remplacer `app/(app)/recipes/page.tsx` par :

```tsx
"use client";

import { useState } from "react";
import type { Recipe } from "@/src/components/generate/types";
import { SAMPLE_RECIPES } from "@/src/components/generate/sampleData";
import { RecipesCard } from "@/src/components/recipes/RecipesCard";
import { RecipeDetail } from "@/src/components/recipes/RecipeDetail";

export default function RecipesPage() {
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [regenIds, setRegenIds] = useState<Set<number>>(new Set());

  const handleRegenerate = (id: number) => {
    setRegenIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setRegenIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2500);
  };

  return (
    <>
      {/* En-tête */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-text)]">
            Mes recettes
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Semaine du 3 au 7 mars · 5 repas · Cliquer sur une recette pour les détails
          </p>
        </div>
        <button className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_3px_12px_rgba(196,96,45,0.28)] transition-colors hover:bg-[var(--color-primary-hover)]">
          📋 Liste d'épicerie
        </button>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[18px]">
        {SAMPLE_RECIPES.map((recipe) => (
          <div key={recipe.id ?? recipe.name} className="relative">
            {/* Overlay de régénération */}
            {recipe.id !== undefined && regenIds.has(recipe.id) && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl text-[13px] font-semibold text-[var(--color-primary)]"
                style={{
                  background: "rgba(250,248,245,0.85)",
                  backdropFilter: "blur(2px)",
                }}
              >
                <span className="inline-block animate-[spin_1s_linear_infinite] text-2xl">
                  ⟳
                </span>
                Génération…
              </div>
            )}
            <RecipesCard recipe={recipe} onOpen={setSelected} />
          </div>
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <RecipeDetail
          recipe={selected}
          onClose={() => setSelected(null)}
          onRegenerate={handleRegenerate}
        />
      )}
    </>
  );
}
```

**Step 2: Build check**

```bash
pnpm build
```
Expected: build sans erreur TypeScript.

**Step 3: Commit**

```bash
git add app/(app)/recipes/page.tsx
git commit -m "feat(recipes): implement recipes page with card grid and detail modal"
```

---

## Checklist finale

- [ ] `pnpm build` passe sans erreur
- [ ] Type `Recipe` étendu avec champs optionnels — `/generate` non cassé
- [ ] `sampleData.ts` contient les 5 recettes enrichies (nutrition + ingrédients + étapes)
- [ ] `RecipesCard` : hover translateY, bouton ♡/♥ toggle, badges bas-gauche, description
- [ ] `RecipeDetail` : backdrop blur, slide-up, hero 200px, nutrition pills, ingrédients, étapes, 2 boutons
- [ ] Régénérer : spinner 2s, overlay sur la card dans la grille
- [ ] Page `/generate` toujours fonctionnelle (pas de régression)

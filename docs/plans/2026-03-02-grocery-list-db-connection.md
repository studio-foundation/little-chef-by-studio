# Design — STU-210 : Connecter /grocery-list aux données DB

**Date :** 2026-03-02
**Issue :** [STU-210](https://linear.app/studioag/issue/STU-210)
**Autrice :** Ariane Guay

---

## Contexte

La page `/grocery-list` utilise `GROCERY_DATA` hardcodé. Le pipeline `meal-planner-weekly` dispose déjà d'un stage `consolidate-grocery-list` qui persiste les items en DB via `db-upsert_grocery_list` → `scripts/upsert-grocery-list.ts`.

**Format DB (`GroceryList.items`)** : tableau plat `[{ name, quantity, group }]`

---

## Architecture

3 fichiers touchés :

| Fichier | Action |
|---------|--------|
| `app/api/grocery-list/route.ts` | Créer — GET auth + Prisma + transformation |
| `app/(app)/grocery-list/page.tsx` | Refactor — Server Component |
| `app/(app)/grocery-list/GroceryListClient.tsx` | Créer — extraire le code interactif actuel |

**Flux :**
```
page.tsx (Server Component)
  → fetch('/api/grocery-list')   ← auth + prisma + transform
  → <GroceryListClient groups={groups} weekStart={weekStart} />
      → localStorage checkboxes, copy, progress bar
```

---

## Section 1 : GET /api/grocery-list

**Auth :** `auth()` — 401 si non authentifié.

**Requête Prisma :**
```ts
prisma.weeklyPlan.findFirst({
  where: { userId, groceryList: { isNot: null } },
  orderBy: { weekStart: 'desc' },
  include: { groceryList: true },
})
```

**Réponse vide :** `{ empty: true }` (200)

**Réponse normale :**
```ts
{
  weekStart: string, // ISO date
  groups: [
    {
      rayon: string,   // ex: "🥬 Légumes & fruits"
      bg: string,      // ex: "#EDF3EE"
      accent: string,  // ex: "#4a7c59"
      items: [
        { id: string, name: string, qty: string }
      ]
    }
  ]
}
```

**Mapping `group` → rayon :**

| group (DB) | rayon (UI) | bg | accent |
|---|---|---|---|
| légumes, légumes & fruits | 🥬 Légumes & fruits | #EDF3EE | #4a7c59 |
| protéines, viande, poisson | 🥩 Protéines | #FAF0EE | #C4602D |
| épicerie sèche, féculents, céréales | 🌾 Épicerie sèche | #FAF4EB | #A87C3A |
| condiments, sauces | 🧴 Condiments & sauces | #F3EDF7 | #8B5BA8 |
| épices, aromates | 🧂 Épices & aromates | #FAF6E8 | #A87C3A |
| produits frais, frais, laitier | 🧀 Frais & autres | #EEF4FA | #4A6F96 |
| autres / non reconnu | 📦 Autres | #F5F5F0 | #888 |

**IDs d'items :** `slugify(name)` — remplace espaces et caractères spéciaux pour les clés localStorage.

---

## Section 2 : page.tsx refactor

`page.tsx` devient Server Component :
- Auth check → redirect('/login') si non auth
- Fetch `GET /api/grocery-list` (server-side, avec cookie forwarding)
- Retourne `<EmptyState />` si `data.empty`
- Sinon retourne `<GroceryListClient groups={data.groups} weekStart={data.weekStart} />`

---

## Section 3 : GroceryListClient.tsx

Extraction exacte du code interactif actuel de `page.tsx` :
- `useState` checked, copied
- `useEffect` localStorage
- `toggle`, `handleCopy`, `buildExportText`
- Composant `GroceryGroup`
- Progress bar, "Tout décocher", état "Courses terminées !"

**Changement :** sous-titre dynamique basé sur `weekStart` prop (ex: "Semaine du 2 mars") au lieu de la date hardcodée.

**localStorage key :** `"grocery-checked"` — inchangée pour ne pas casser les sessions existantes.

---

## Section 4 : État vide

Quand `data.empty === true` :
```
🛒
Aucune liste d'épicerie
Génère ton premier plan de semaine pour voir ta liste apparaître ici.
[→ Générer un plan]  (lien vers /generate)
```

---

## Critères d'acceptation

- [ ] `GET /api/grocery-list` retourne les items du dernier WeeklyPlan du user avec GroceryList
- [ ] `/grocery-list` affiche les vrais items groupés par rayon
- [ ] État vide si aucun plan avec grocery list
- [ ] Logique de coches (localStorage) et export texte fonctionnels
- [ ] `pnpm build` passe

---

## Hors scope

- Génération manuelle de la GroceryList (le pipeline le fait)
- Reset de localStorage par semaine
- Rafraîchissement sans rechargement de page

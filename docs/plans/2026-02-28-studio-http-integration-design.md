# Design — HTTP Integration avec Studio API

**Date :** 2026-02-28
**Ticket :** STU-205 (pivot d'implémentation — HTTP au lieu de PgRunStore embedded)
**Statut :** Approuvé

---

## Contexte

Little Chef génère 5 repas par semaine via des pipelines Studio. L'architecture retenue est **HTTP** : Little Chef appelle Studio API (`studio api start`) via `POST /api/runs` et écoute les résultats en temps réel via SSE. Cette approche évite d'embarquer `@studio/engine` dans Little Chef.

Le `.studio/` de Little Chef est déjà configuré (pipelines, agents, contracts, `runs.db` présent).

---

## Architecture

```
[Bouton "Générer"]
  → POST /api/generate  (Next.js route handler)
      → 5 × POST http://localhost:3001/api/runs
              { pipeline: 'recipe-developer', input: { dish_name, constraints } }
      ← { runs: [{ run_id, stream_url }] }
  → 5 × EventSource(`${NEXT_PUBLIC_STUDIO_API_URL}/api/runs/${run_id}/stream`)
      ← stage_start       → animer le skeleton, afficher le stage en cours
      ← stage_complete    → extraire output_summary / output
      ← pipeline_complete → marquer la recette comme prête, révéler la card
      ← done              → fermer le stream
```

---

## Fichiers

| Fichier | Action |
|---------|--------|
| `app/api/generate/route.ts` | NOUVEAU — lance 5 runs en parallèle vers Studio API |
| `src/lib/studio/client.ts` | NOUVEAU — wrapper typed pour appels Studio API |
| `app/(app)/generate/page.tsx` | MODIFIÉ — remplace mock + setInterval par SSE réelle |
| `.env.local` | NOUVEAU — variables d'env Studio API |

---

## Variables d'environnement

```env
STUDIO_API_URL=http://localhost:3001            # server-side (route handler)
NEXT_PUBLIC_STUDIO_API_URL=http://localhost:3001# client-side (EventSource)
```

---

## SSE Events

Noms exacts confirmés dans `@studio/api/src/event-bus.ts` :

| Événement | Champs utiles | Utilisation UI |
|-----------|--------------|----------------|
| `stage_start` | `stage_name`, `stage_index`, `total_stages` | Afficher stage actuel dans skeleton |
| `stage_complete` | `stage_name`, `output_summary`, `output`, `status` | Mettre à jour la card |
| `pipeline_complete` | `status` (success/failed/cancelled) | Révéler ou afficher erreur |
| `done` | — | Fermer EventSource |

---

## État du generate page

```typescript
type RecipeSlot = {
  status: 'idle' | 'running' | 'done' | 'error';
  currentStage?: string;
  stageIndex?: number;
  totalStages?: number;
  recipe?: unknown;  // output de la dernière stage_complete pertinente
  runId?: string;
};

// 5 slots, un par recette
const [slots, setSlots] = useState<RecipeSlot[]>(Array(5).fill({ status: 'idle' }));
```

---

## Input des 5 runs (MVP)

5 requêtes hardcodées, remplacées par le profil utilisateur plus tard :

```typescript
const RECIPE_REQUESTS = [
  { dish_name: 'Ramen tonkotsu végétalien', constraints: ['sans produits animaux', '90 min max', '4 personnes'] },
  { dish_name: 'Buddha bowl quinoa', constraints: ['sans gluten', '30 min max', '2 personnes'] },
  { dish_name: 'Curry de pois chiches', constraints: ['végétalien', '45 min max', '4 personnes'] },
  { dish_name: 'Pâtes primavera', constraints: ['végétarien', '30 min max', '2 personnes'] },
  { dish_name: 'Soupe miso aux légumes', constraints: ['sans gluten', '20 min max', '2 personnes'] },
];
```

---

## API route `/api/generate`

```typescript
// POST /api/generate
// Body: { recipeRequests?: RecipeInput[] }
// Response: { runs: Array<{ run_id: string; stream_url: string }> }

// Lance 5 POST /api/runs en parallèle vers Studio API
// Retourne les run_ids pour que le client ouvre les EventSource
```

---

## Studio API — pré-requis

Studio API doit tourner sur port 3001 avant de tester :

```bash
cd /path/to/little-chef-by-studio
studio api start
```

CORS : `origin: true` déjà configuré dans Studio API — pas de configuration supplémentaire.

---

## Hors scope (pour l'instant)

- Parsing structuré de la recette (titre, ingrédients, étapes) → recette affichée via `output_summary`
- Profil utilisateur (onboarding) → inputs hardcodés en MVP
- Persistance PostgreSQL (PgRunStore) → SQLite de Studio pour l'instant
- Pipeline `meal-planner-weekly` → 5 runs indépendants en parallèle

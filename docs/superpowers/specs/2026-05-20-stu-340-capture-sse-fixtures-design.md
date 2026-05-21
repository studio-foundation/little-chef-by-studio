# Design — STU-340 : Capturer 10 runs réels comme fixtures SSE

## Contexte

Pour le replay frontend de la démo Little Chef, on a besoin de fixtures statiques représentant de vrais runs Studio. Chaque fixture capture la timeline complète d'un run `recipe-developer` : events SSE, tool calls, durées, output final.

Ce ticket couvre aussi implicitement STU-339 (définir les 10 inputs préfaits) puisqu'il faut des inputs pour capturer les fixtures.

## Architecture

```
scripts/
  capture-fixture.ts       # script de capture principal
lib/
  examples.ts              # 10 inputs préfaits typés (couvre STU-339)
fixtures/
  runs/
    01-pad-thai-vegan.json
    02-risotto-champignons.json
    03-tacos-tofu-coreens.json
    04-soupe-miso-hivernale.json
    05-curry-vert-thai-poulet.json
    06-lasagne-vegetarienne.json
    07-bibimbap-sans-gluten.json
    08-salade-nicoise.json
    09-dahl-lentilles-corail.json
    10-boeuf-bourguignon.json
  README.md                # documentation recapture
```

## Format de fixture

```json
{
  "id": "01-pad-thai-vegan",
  "input": {
    "dish_name": "Pad Thai vegan",
    "constraints": ["sans produits animaux", "30 min max", "4 portions"]
  },
  "captured_at": "2026-05-20T...",
  "duration_ms": 45000,
  "events": [
    { "offset_ms": 0,    "event": "pipeline_start", "pipeline_name": "recipe-developer" },
    { "offset_ms": 120,  "event": "stage_start", "stage_name": "culinary-research", "stage_index": 0, "total_stages": 7 },
    { "offset_ms": 8400, "event": "stage_complete", "stage_name": "culinary-research", "status": "success", "duration_ms": 8280 },
    ...
  ]
}
```

Timestamps relatifs au `pipeline_start` (offset_ms) → replay frontend déterministe.

## Les 10 inputs (`lib/examples.ts`)

| # | Slug | Recette | Contraintes |
|---|------|---------|-------------|
| 01 | pad-thai-vegan | Pad Thai vegan | sans produits animaux, 30 min max, 4 portions |
| 02 | risotto-champignons | Risotto aux champignons sauvages | végétarien, 4 portions, ingrédients accessibles |
| 03 | tacos-tofu-coreens | Tacos au tofu coréens | sans produits animaux, 6 portions, épicé niveau moyen |
| 04 | soupe-miso-hivernale | Soupe miso enrichie pour l'hiver | sans gluten, 2 portions, réconfortant, peu d'ingrédients |
| 05 | curry-vert-thai-poulet | Curry vert thaï poulet | 30 min max, 4 portions, niveau intermédiaire |
| 06 | lasagne-vegetarienne | Lasagne végétarienne maison | végétarien, 6 portions, peut se préparer à l'avance |
| 07 | bibimbap-sans-gluten | Bibimbap | sans gluten, 2 portions, budget raisonnable |
| 08 | salade-nicoise | Salade niçoise classique | sans cuisson, 4 portions, recette classique fidèle |
| 09 | dahl-lentilles-corail | Dahl de lentilles corail | sans produits animaux, sans gluten, 30 min max, 4 portions |
| 10 | boeuf-bourguignon | Boeuf bourguignon traditionnel | 6 portions, recette traditionnelle, mijotage long ok |

## Script `capture-fixture.ts`

### Comportement

1. Lit `lib/examples.ts` pour obtenir les 10 inputs
2. Pour chaque input :
   a. Écrit un fichier YAML temporaire dans `/tmp/`
   b. Lance `studio run recipe-developer --input-file <tmp.yaml>` via `child_process.spawn`
   c. Attend la fin du run
   d. Trouve le fichier JSONL le plus récent dans `.studio/runs/`
   e. Parse le JSONL ligne par ligne
   f. Normalise les timestamps en `offset_ms` relatifs au `pipeline_start`
   g. Écrit `fixtures/runs/<slug>.json`
   h. Log durée et nb d'events
3. Runs séquentiels (un à la fois) pour faciliter le debug si un run échoue

### Invocation

```bash
npx tsx scripts/capture-fixture.ts           # tous les 10
npx tsx scripts/capture-fixture.ts --only 3  # run #3 uniquement (recapture)
npx tsx scripts/capture-fixture.ts --only 1,5,9  # runs sélectifs
```

### Normalisation des events

- Garder tous les types d'events : `pipeline_start`, `stage_start`, `stage_complete`, `stage_context`, `pipeline_complete`, `tool_call` (si présents)
- Supprimer le champ `ts` absolu, le remplacer par `offset_ms`
- Conserver `run_id` uniquement dans le champ racine (pas dans chaque event)
- Si un event dépasse 10KB (ex: output d'un stage), tronquer le contenu avec un flag `truncated: true`

### Gestion d'erreurs

- Si un run échoue (status `failed`), logger l'erreur et continuer avec le suivant
- Ne pas écraser une fixture existante si le run échoue (protection)
- À la fin, afficher un résumé : X/10 capturés, échecs éventuels

## `fixtures/README.md`

Documente :
- Ce que contient chaque fixture
- Comment recapturer une fixture (`--only <n>`)
- Coût estimé par run (~0.50-1$)
- Prérequis : `ANTHROPIC_API_KEY` et `TAVILY_API_KEY` dans l'environnement

## Critères de succès

- 10 fixtures dans `fixtures/runs/*.json`
- Chaque fixture < 100KB
- Script reproductible (peut recapturer n'importe quelle fixture)
- `pnpm build` passe après les changements

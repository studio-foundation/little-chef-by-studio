# STU-106 — Pipelines YAML : recipe-developer & meal-planner-weekly

Date: 2026-03-01
Linear: https://linear.app/studioag/issue/STU-106

## Contexte

Finaliser `recipe-developer.pipeline.yaml` (ajouter stage `grocery-list`) et créer `meal-planner-weekly.pipeline.yaml` qui orchestre N runs `recipe-developer` séquentiels (N configurable, 3..7, défaut 5).

Le tool `studio-run` (STU-105, Done) est disponible.

## Architecture

### Fichiers modifiés

- `.studio/pipelines/recipe-developer.pipeline.yaml` — ajouter stage `grocery-list` en fin

### Fichiers créés

```
.studio/
├── pipelines/
│   └── meal-planner-weekly.pipeline.yaml
├── agents/
│   ├── grocery-list.agent.yaml
│   ├── meal-planner.agent.yaml
│   ├── recipe-orchestrator.agent.yaml
│   └── grocery-consolidator.agent.yaml
├── contracts/
│   ├── grocery-list.contract.yaml
│   ├── meal-selection.contract.yaml
│   └── consolidated-grocery-list.contract.yaml
├── tools/
│   └── studio-run.tool.yaml
└── inputs/
    └── weekly-plan-request.input.yaml
```

## Design détaillé

### 1. recipe-developer — Stage `grocery-list`

Ajouté après le groupe `recipe-refinement`.

```yaml
- name: grocery-list
  kind: generation
  agent: grocery-list
  contract: grocery-list
  ralph:
    max_attempts: 2
  context:
    include:
      - input
      - all_stage_outputs   # contient la recette finalisée de recipe-drafting
```

**Agent `grocery-list`** : reçoit la recette du contexte, produit une liste structurée par rayon. Pas de DB — JSON pur.

**Output schema** :
```json
{
  "items": [{ "name": "tofu ferme", "quantity": "400g", "group": "protéines" }],
  "sections": {
    "protéines": [...],
    "légumes": [...],
    "épicerie sèche": [...],
    "condiments": [...]
  }
}
```

**Contract** : `items` + `sections` requis.

### 2. meal-planner-weekly — Pipeline

```yaml
name: meal-planner-weekly
version: 1

stages:
  - name: meal-selection
    kind: planning
    agent: meal-planner
    contract: meal-selection
    ralph:
      max_attempts: 3
    context:
      include:
        - input

  - name: recipe-runs
    kind: orchestration
    agent: recipe-orchestrator
    contract: recipe-runs
    ralph:
      max_attempts: 2
    context:
      include:
        - input
        - previous_stage_output   # weekly_briefs de meal-selection
    tools:
      required:
        - studio-run-run_pipeline

  - name: consolidate-grocery-list
    kind: aggregation
    agent: grocery-consolidator
    contract: consolidated-grocery-list
    ralph:
      max_attempts: 2
    context:
      include:
        - input
        - all_stage_outputs
    tools:
      required:
        - db-upsert_grocery_list
```

### 3. meal-selection

**Agent `meal-planner`** : reçoit `profiles`, `history`, `week_constraints`. Génère exactement `meal_count` briefs diversifiés (pas de cuisine répétée, respect de l'historique).

**Output** :
```json
{
  "weekly_briefs": [
    { "dish_brief": "Curry de lentilles rouge", "cuisine": "indienne", "constraints": ["sans gluten", "max 45min"] },
    ...
  ]
}
```

**Contract `meal-selection`** :
- `weekly_briefs` requis
- `rejection_detection` : si `status != complete` ou si count ne correspond pas à `meal_count`

### 4. recipe-runs

**Agent `recipe-orchestrator`** : itère sur `weekly_briefs`, appelle `studio-run-run_pipeline` séquentiellement pour chaque brief. Gestion d'erreur : si un run enfant échoue, tente une recette alternative (RALPH).

**Output** :
```json
{
  "runs": [
    { "recipe": { "title": "...", ... }, "grocery_list": { "items": [...], "sections": {...} } },
    ...
  ]
}
```

**Contract `recipe-runs`** : `runs` requis, `rejection_detection` si `runs.length != weekly_briefs.length`.

### 5. consolidate-grocery-list

**Agent `grocery-consolidator`** : extrait les `grocery_list` des N runs, fusionne les items (même ingrédient = cumul des quantités), regroupe par rayon. Appelle `db-upsert_grocery_list`.

**Contract `consolidated-grocery-list`** : `items` + `sections` requis, `tool_calls.minimum: 1`.

### 6. studio-run.tool.yaml

```yaml
name: studio-run
version: 1
commands:
  - name: run-pipeline
    description: Launch a Studio pipeline run and wait for completion
    parameters:
      pipeline:
        type: string
        required: true
      input:
        type: object
        required: true
      wait:
        type: boolean
        default: true
    execute:
      type: shell
      command: |
        curl -s -X POST http://localhost:3001/api/runs \
          -H "Content-Type: application/json" \
          -d '{"pipeline": "{{pipeline}}", "input": {{input | json}}, "wait": {{wait}}}'
      parse_output: json
```

URL : `localhost:3001` (STUDIO_API_URL per `CLAUDE.md`).

### 7. Input de test — weekly-plan-request.input.yaml

```yaml
userId: "dev-user-001"
week_constraints:
  meal_count: 5
  max_prep_time_minutes: 45
  servings: 2
  avoid_repeat_from_history: true
profiles:
  person_1:
    name: "Ariane"
    dietary_constraints: ["sans gluten"]
    sensory_profile:
      spice_tolerance: low
      texture_aversions: ["gluant"]
      sauce_preference: light
history:
  recent_cuisines: ["italienne", "mexicaine"]
  recent_recipes: ["Pasta primavera", "Tacos"]
  favoris: []
```

## Error Handling

| Étape | Fail | Comportement |
|-------|------|--------------|
| `meal-selection` | < `meal_count` briefs | rejection_detection → RALPH (max 3) |
| `recipe-runs` | run enfant échoue | agent tente une recette alternative, RALPH (max 2) |
| `consolidate-grocery-list` | `runs.length` mismatch | rejection_detection |

Le fail d'un run enfant ne propage pas automatiquement au parent — le `recipe-orchestrator` décide (comportement STU-105).

## DB — Nouvelle commande

Ajouter `db-upsert_grocery_list` à `.studio/tools/db.tool.yaml` pour persister la liste consolidée (liée à un `weeklyPlanId`).

## Contraintes design

- `grocery-list` dans `recipe-developer` : JSON pur, aucune persistance DB
- `meal_count` dans `week_constraints` : 3..7, défaut 5
- Cuisines : pas de doublon dans les `weekly_briefs` (enforced par `meal-planner` agent prompt)
- Historique : `avoid_repeat_from_history` = pas la même recette 2 semaines de suite

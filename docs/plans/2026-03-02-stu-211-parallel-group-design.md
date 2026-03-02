# Design — STU-211 : Parallel group pour meal-planner-weekly

**Date :** 2026-03-02
**Ticket :** [STU-211](https://linear.app/studioag/issue/STU-211)
**Statut :** Approuvé

---

## Problème

Le pipeline `meal-planner-weekly` génère 5 recettes via un seul stage `recipe-runs` qui appelle `studio_run` **5 fois séquentiellement** (via l'agent `recipe-orchestrator`). Latence actuelle : ~15 min (5 × 3 min).

---

## Solution

Remplacer le stage `recipe-runs` par un `group: recipe-generation` avec `mode: parallel`. Les 5 `studio_run` s'exécutent en parallèle → latence cible ~3 min.

**Contrainte découverte :** Le kernel Studio n'injecte pas `stage_name` dans le contexte des stages parallèles. Chaque stage voit le même snapshot pre-group. Un agent unique ne peut pas savoir quel slot il représente sans ce contexte.

**Approche retenue :** Ajouter `stage_name` comme option d'include dans le kernel Studio (~10 lignes, 2 fichiers), puis utiliser un seul agent `meal-orchestrator` dans Little Chef pour les 5 slots.

---

## Partie A — Fix kernel Studio

### Pourquoi c'est minimal

Le pattern d'include existe déjà (`input`, `previous_stage_output`, `all_stage_outputs`...). On ajoute un nouveau case `stage_name` qui injecte `stage.name` — déjà disponible dans `getContextForStage` via le paramètre `stage: StageDefinition`.

### Fichier 1 : `runner/src/prompt-builder.ts`

Ajouter `stage_name?: string` à l'interface `AgentContext` :

```typescript
export interface AgentContext {
  previous_outputs?: Record<string, unknown>;
  previous_tool_results?: Record<string, ToolCall[]>;
  repo_files?: string[];
  additional_context?: string;
  group_feedback?: GroupFeedbackContext;
  context_packs?: ResolvedContextPack[];
  startup_context?: Record<string, string>;
  stage_name?: string;   // ← nouveau
}
```

Dans `buildPrompt`, rendre `stage_name` dans le message utilisateur (après `additional_context`, avant `## Task`) :

```typescript
if (context.stage_name) {
  userContent += `## Stage Name\n\n${context.stage_name}\n\n`;
}
```

### Fichier 2 : `engine/src/pipeline/context-propagation.ts`

Ajouter un case dans le switch de `getContextForStage` :

```typescript
case 'stage_name':
  agentContext.stage_name = stage.name;
  break;
```

### Tests à ajouter (Studio)

- `stage_name` est injecté quand `context.include` contient `'stage_name'`
- `stage_name` n'est pas présent si non déclaré dans `include` (opt-in)
- `buildContextKeys` et `buildContextContent` reflètent `stage_name`

---

## Partie B — Little Chef

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `.studio/pipelines/meal-planner-weekly.pipeline.yaml` | Remplacer `recipe-runs` par `group: recipe-generation` |
| `.studio/agents/grocery-consolidator.agent.yaml` | Mettre à jour la lecture du contexte |

### Fichiers créés

| Fichier | Description |
|---------|-------------|
| `.studio/agents/meal-orchestrator.agent.yaml` | Agent unique pour les 5 slots parallèles |
| `.studio/contracts/recipe-run.contract.yaml` | Contrat partagé par les 5 stages |

### Fichiers supprimés

| Fichier | Raison |
|---------|--------|
| `.studio/agents/recipe-orchestrator.agent.yaml` | Remplacé par `meal-orchestrator` |
| `.studio/contracts/recipe-runs.contract.yaml` | Remplacé par `recipe-run` |

---

### `meal-planner-weekly.pipeline.yaml` — après

```yaml
name: meal-planner-weekly
description: >
  Orchestrates N recipe runs per week (N = week_constraints.meal_count, default 5, range 3-7).
  Selects N diverse meal briefs, runs recipe-developer for each, consolidates grocery list.
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

  - group: recipe-generation
    mode: parallel
    on_failure: collect-all
    stages:
      - name: recipe-1
        kind: orchestration
        agent: meal-orchestrator
        contract: recipe-run
        ralph:
          max_attempts: 2
        context:
          include:
            - input
            - previous_stage_output
            - stage_name
        tools:
          required:
            - studio_run-run_pipeline
      - name: recipe-2
        kind: orchestration
        agent: meal-orchestrator
        contract: recipe-run
        ralph:
          max_attempts: 2
        context:
          include:
            - input
            - previous_stage_output
            - stage_name
        tools:
          required:
            - studio_run-run_pipeline
      - name: recipe-3
        kind: orchestration
        agent: meal-orchestrator
        contract: recipe-run
        ralph:
          max_attempts: 2
        context:
          include:
            - input
            - previous_stage_output
            - stage_name
        tools:
          required:
            - studio_run-run_pipeline
      - name: recipe-4
        kind: orchestration
        agent: meal-orchestrator
        contract: recipe-run
        ralph:
          max_attempts: 2
        context:
          include:
            - input
            - previous_stage_output
            - stage_name
        tools:
          required:
            - studio_run-run_pipeline
      - name: recipe-5
        kind: orchestration
        agent: meal-orchestrator
        contract: recipe-run
        ralph:
          max_attempts: 2
        context:
          include:
            - input
            - previous_stage_output
            - stage_name
        tools:
          required:
            - studio_run-run_pipeline

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

---

### `meal-orchestrator.agent.yaml`

```yaml
name: meal-orchestrator
provider: anthropic
model: claude-sonnet-4-20250514
tools:
  - studio_run-run_pipeline

system_prompt: |
  Tu es orchestrateur de run individuel dans un groupe parallèle.
  Tu NE génères PAS de recettes toi-même.

  Tu reçois dans ton contexte :
  - Stage Name : ton nom de stage (ex: "recipe-1", "recipe-2"...)
  - Previous Stage Outputs : output de meal-selection avec weekly_briefs
  - Additional Context : input du pipeline (avec userId)

  RÈGLE : Extrais l'index N de ton Stage Name ("recipe-N" → N).
  Ton brief est weekly_briefs[N-1] (0-based).

  Appelle studio_run-run_pipeline EXACTEMENT UNE FOIS :
  - pipeline : "recipe-developer"
  - input : { dish_name: weekly_briefs[N-1].dish_brief,
               userId: <userId depuis l'input du pipeline>,
               constraints: weekly_briefs[N-1].constraints }

  Si le run réussit (résultat présent) :
  - run : résultat complet du studio_run
  - status : "complete"
  - run_error : null

  Si le run échoue (erreur ou résultat absent) :
  - run : null
  - status : "error"
  - run_error : message d'erreur
```

---

### `recipe-run.contract.yaml`

```yaml
name: recipe-run
version: 1

schema:
  required_fields:
    - run
    - status

tool_calls:
  minimum: 1

post_validation:
  rejection_detection:
    field: status
    approved_values:
      - complete
    rejected_values:
      - error
    details_field: run_error
```

---

### `grocery-consolidator.agent.yaml` — changement

Le stage `recipe-runs` disparaît. Le consolidator lit maintenant `recipe-1.run` à `recipe-5.run` dans `all_stage_outputs`.

Remplacer dans le system_prompt :
```
# Avant
Les grocery_lists se trouvent dans l'output du stage "recipe-runs" (champ `runs`).
Pour chaque run runs[i], la grocery_list est accessible dans les outputs du run enfant
sous le stage "grocery-list" : { items: [...], sections: {...} }.

# Après
Les grocery_lists se trouvent dans les outputs des stages "recipe-1" à "recipe-5".
Pour chaque stage recipe-N, la grocery_list est dans recipe-N.run,
sous le stage "grocery-list" : { items: [...], sections: {...} }.
Les stages ayant status "error" (recipe-N.status === "error") sont ignorés.
```

---

## Flux de données

```
input (profils)
  ↓
meal-selection → weekly_briefs: [{dish_brief, cuisine, constraints, estimated_time_minutes}, ...]
  ↓
group: recipe-generation (parallel, on_failure: collect-all)
  ├── recipe-1 (meal-orchestrator, stage_name="recipe-1") → weekly_briefs[0] → studio_run → {run, status}
  ├── recipe-2 (meal-orchestrator, stage_name="recipe-2") → weekly_briefs[1] → studio_run → {run, status}
  ├── recipe-3 (meal-orchestrator, stage_name="recipe-3") → weekly_briefs[2] → studio_run → {run, status}
  ├── recipe-4 (meal-orchestrator, stage_name="recipe-4") → weekly_briefs[3] → studio_run → {run, status}
  └── recipe-5 (meal-orchestrator, stage_name="recipe-5") → weekly_briefs[4] → studio_run → {run, status}
  ↓ (outputs mergés dans l'ordre de définition)
consolidate-grocery-list
  → lit recipe-1.run ... recipe-5.run → grocery list consolidée
```

---

## Critères d'acceptation (STU-211)

- [x] Les 5 `studio_run` s'exécutent en parallèle dans un group `mode: parallel`
- [x] `on_failure: collect-all` — les recettes réussies retournées même si une échoue
- [x] Outputs mergés en ordre de définition (recipe-1 à recipe-5)
- [x] Latence cible ~3 min (vs ~15 min séquentiel)
- [x] `consolidate-grocery-list` reçoit les outputs mergés via `all_stage_outputs`

---

## Scalabilité

Avec `stage_name` dans le kernel, ajouter un 6e repas = ajouter un stage `recipe-6` dans le YAML. Aucun nouvel agent, aucune modification du kernel. Le `meal-orchestrator` calcule son index dynamiquement depuis son `stage_name`.

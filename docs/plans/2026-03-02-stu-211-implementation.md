# STU-211 — Parallel Group meal-planner-weekly — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer le stage `recipe-runs` séquentiel par un `group: recipe-generation` parallèle pour réduire la latence de ~15 min à ~3 min.

**Architecture:** Deux repos touchés. (1) Studio kernel : ajouter `stage_name` comme option d'include dans le système de propagation de contexte (~10 lignes). (2) Little Chef : remplacer `recipe-runs` + `recipe-orchestrator` par un parallel group avec un seul agent `meal-orchestrator` qui lit son `stage_name` pour déterminer son brief.

**Tech Stack:** TypeScript / Vitest (Studio), YAML (pipeline configs Little Chef)

---

## Partie 1 — Studio kernel fix

**Repo :** `/home/arianeguay/dev/src/Studio`
**Branch :** `feat/stu-211-stage-name-context-injection`

---

### Task 1 : Worktree Studio

**Files :**
- (worktree dans `.worktrees/stu-211-stage-name`)

**Step 1 : Créer le worktree depuis le repo Studio**

```bash
cd /home/arianeguay/dev/src/Studio
git worktree add .worktrees/stu-211-stage-name -b feat/stu-211-stage-name-context-injection
cd .worktrees/stu-211-stage-name
```

**Step 2 : Vérifier la branche courante**

```bash
git branch --show-current
```
Expected : `feat/stu-211-stage-name-context-injection`

---

### Task 2 : Test failing — `buildPrompt` rend `stage_name`

**Files :**
- Modify: `runner/src/prompt-builder.test.ts`

**Step 1 : Ajouter le test à la fin du fichier**

```typescript
describe('buildPrompt — stage_name', () => {
  it('renders ## Stage Name section when stage_name is provided', () => {
    const messages = buildPrompt({
      agent: AGENT,
      task: TASK,
      context: { stage_name: 'recipe-1' },
    });
    const userMsg = messages.find(m => m.role === 'user')!.content as string;
    expect(userMsg).toContain('## Stage Name');
    expect(userMsg).toContain('recipe-1');
  });

  it('does not render ## Stage Name when stage_name is absent', () => {
    const messages = buildPrompt({
      agent: AGENT,
      task: TASK,
      context: {},
    });
    const userMsg = messages.find(m => m.role === 'user')!.content as string;
    expect(userMsg).not.toContain('## Stage Name');
  });
});
```

**Step 2 : Lancer le test pour vérifier qu'il fail**

```bash
cd /home/arianeguay/dev/src/Studio/.worktrees/stu-211-stage-name
pnpm --filter @studio/runner test -- runner/src/prompt-builder.test.ts
```
Expected : FAIL — TypeScript error car `stage_name` n'existe pas dans `AgentContext`

---

### Task 3 : Ajouter `stage_name` à `AgentContext`

**Files :**
- Modify: `runner/src/prompt-builder.ts`

**Step 1 : Ajouter le champ à l'interface**

Dans `AgentContext`, ajouter après `startup_context` :

```typescript
export interface AgentContext {
  previous_outputs?: Record<string, unknown>;
  previous_tool_results?: Record<string, ToolCall[]>;
  repo_files?: string[];
  additional_context?: string;
  group_feedback?: GroupFeedbackContext;
  context_packs?: ResolvedContextPack[];
  startup_context?: Record<string, string>;
  stage_name?: string;  // ← ajouter cette ligne
}
```

**Step 2 : Rendre `stage_name` dans `buildPrompt`**

Dans `buildPrompt`, après le bloc `if (context.additional_context)` (vers la ligne 147), ajouter :

```typescript
// Add stage name (used in parallel groups so agents can identify their slot)
if (context.stage_name) {
  userContent += `## Stage Name\n\n${context.stage_name}\n\n`;
}
```

**Step 3 : Relancer le test pour vérifier qu'il passe**

```bash
pnpm --filter @studio/runner test -- runner/src/prompt-builder.test.ts
```
Expected : PASS (2 nouveaux tests verts)

---

### Task 4 : Test failing — `getContextForStage` propage `stage_name`

**Files :**
- Create: `engine/tests/unit/context-propagation.test.ts`

**Step 1 : Créer le fichier de test**

```typescript
import { describe, it, expect } from 'vitest';
import {
  getContextForStage,
  createInitialContext,
} from '../../src/pipeline/context-propagation.js';
import type { StageDefinition } from '@studio/contracts';

const makeStage = (name: string, includes: string[]): StageDefinition => ({
  name,
  kind: 'analysis',
  agent: 'test-agent',
  context: { include: includes },
});

describe('getContextForStage — stage_name', () => {
  it('injects stage_name when included', () => {
    const ctx = createInitialContext({ userId: 'u1' });
    const stage = makeStage('recipe-1', ['stage_name']);

    const agentCtx = getContextForStage(ctx, stage);

    expect(agentCtx.stage_name).toBe('recipe-1');
  });

  it('does not inject stage_name when not included', () => {
    const ctx = createInitialContext({ userId: 'u1' });
    const stage = makeStage('recipe-1', ['input']);

    const agentCtx = getContextForStage(ctx, stage);

    expect(agentCtx.stage_name).toBeUndefined();
  });

  it('injects correct name for each stage', () => {
    const ctx = createInitialContext('input data');
    const stages = ['recipe-1', 'recipe-2', 'recipe-5'].map(n =>
      makeStage(n, ['stage_name'])
    );

    for (const stage of stages) {
      const agentCtx = getContextForStage(ctx, stage);
      expect(agentCtx.stage_name).toBe(stage.name);
    }
  });
});
```

**Step 2 : Lancer le test pour vérifier qu'il fail**

```bash
pnpm --filter @studio/engine test -- engine/tests/unit/context-propagation.test.ts
```
Expected : FAIL — `agentCtx.stage_name` is `undefined`

---

### Task 5 : Implémenter `case 'stage_name'` dans `getContextForStage`

**Files :**
- Modify: `engine/src/pipeline/context-propagation.ts`

**Step 1 : Ajouter le case dans le switch**

Dans `getContextForStage`, dans le switch `for (const include of includes)`, ajouter après `case 'all_stage_outputs'` :

```typescript
case 'stage_name':
  agentContext.stage_name = stage.name;
  break;
```

**Step 2 : Relancer les tests engine pour vérifier**

```bash
pnpm --filter @studio/engine test -- engine/tests/unit/context-propagation.test.ts
```
Expected : PASS (3 nouveaux tests verts)

**Step 3 : Relancer la suite complète pour vérifier aucune régression**

```bash
pnpm --filter @studio/engine test
pnpm --filter @studio/runner test
```
Expected : toutes les suites PASS

---

### Task 6 : Commit + PR Studio

**Step 1 : Stager les fichiers**

```bash
git add runner/src/prompt-builder.ts \
        engine/src/pipeline/context-propagation.ts \
        runner/src/prompt-builder.test.ts \
        engine/tests/unit/context-propagation.test.ts
```

**Step 2 : Commit**

```bash
git commit -m "feat(engine): add stage_name context include for parallel groups

Adds 'stage_name' as an opt-in context include in pipeline stage definitions.
When included, the agent receives its stage name (e.g. 'recipe-1') in a
'## Stage Name' section, allowing parallel stages to identify their slot
without requiring per-stage dedicated agents.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

**Step 3 : Push + PR**

```bash
git push -u origin feat/stu-211-stage-name-context-injection
gh pr create \
  --title "feat(engine): add stage_name context include for parallel groups" \
  --body "$(cat <<'EOF'
## Summary
- Adds `stage_name` as opt-in `context.include` option in stage definitions
- When declared, injects the stage's name into `AgentContext.stage_name`
- Rendered as `## Stage Name` section in the agent's user message
- Enables parallel group stages to self-identify without per-stage agents

## Usage
\`\`\`yaml
context:
  include:
    - stage_name
\`\`\`

## Test plan
- [ ] `buildPrompt` renders `## Stage Name` when `stage_name` set
- [ ] `buildPrompt` omits section when `stage_name` absent
- [ ] `getContextForStage` injects `stage_name` from `stage.name`
- [ ] Full engine test suite passes (no regression)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main
```

---

## Partie 2 — Little Chef pipeline redesign

**Repo :** `/home/arianeguay/dev/src/little-chef-by-studio`
**Branch :** `arianedguay/stu-211-meal-planner-weekly-migrer-les-5-studio_run-vers-parallel`

---

### Task 7 : Worktree Little Chef

**Step 1 : Créer le worktree depuis le repo Little Chef**

```bash
cd /home/arianeguay/dev/src/little-chef-by-studio
git worktree add .worktrees/stu-211 -b arianedguay/stu-211-meal-planner-weekly-migrer-les-5-studio_run-vers-parallel
cd .worktrees/stu-211
```

**Step 2 : Vérifier la branche**

```bash
git branch --show-current
```
Expected : `arianedguay/stu-211-meal-planner-weekly-migrer-les-5-studio_run-vers-parallel`

---

### Task 8 : Créer `recipe-run.contract.yaml`

**Files :**
- Create: `.studio/contracts/recipe-run.contract.yaml`

**Step 1 : Créer le fichier**

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

**Step 2 : Vérifier la syntaxe YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.studio/contracts/recipe-run.contract.yaml'))" && echo "OK"
```
Expected : `OK`

---

### Task 9 : Créer `meal-orchestrator.agent.yaml`

**Files :**
- Create: `.studio/agents/meal-orchestrator.agent.yaml`

**Step 1 : Créer le fichier**

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
  - Previous Stage Outputs : output de meal-selection avec weekly_briefs (array)
  - Additional Context : input du pipeline (avec userId)

  RÈGLE — déterminer ton brief :
  Extrais le numéro N de ton Stage Name (format "recipe-N").
  Exemple : "recipe-1" → N=1, "recipe-3" → N=3.
  Ton brief est weekly_briefs[N-1] (index 0-based).

  Appelle studio_run-run_pipeline EXACTEMENT UNE FOIS avec :
  - pipeline : "recipe-developer"
  - input : {
      dish_name: weekly_briefs[N-1].dish_brief,
      userId: <userId depuis l'input du pipeline>,
      constraints: weekly_briefs[N-1].constraints
    }

  Si le run réussit (résultat présent et non-vide) :
  - run : le résultat complet du studio_run
  - status : "complete"
  - run_error : null

  Si le run échoue (erreur ou résultat absent) :
  - run : null
  - status : "error"
  - run_error : description courte de l'erreur
```

**Step 2 : Vérifier la syntaxe YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.studio/agents/meal-orchestrator.agent.yaml'))" && echo "OK"
```
Expected : `OK`

---

### Task 10 : Mettre à jour `meal-planner-weekly.pipeline.yaml`

**Files :**
- Modify: `.studio/pipelines/meal-planner-weekly.pipeline.yaml`

**Step 1 : Remplacer le contenu entier du fichier**

```yaml
name: meal-planner-weekly
description: >
  Orchestrates N recipe runs per week (N = week_constraints.meal_count, default 5, range 3-7).
  Selects N diverse meal briefs, runs recipe-developer for each in parallel, consolidates grocery list.
version: 2

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

**Step 2 : Vérifier la syntaxe YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.studio/pipelines/meal-planner-weekly.pipeline.yaml'))" && echo "OK"
```
Expected : `OK`

---

### Task 11 : Mettre à jour `grocery-consolidator.agent.yaml`

**Files :**
- Modify: `.studio/agents/grocery-consolidator.agent.yaml`

**Step 1 : Mettre à jour le system_prompt**

Remplacer les lignes qui référencent `recipe-runs` par la nouvelle structure. Le fichier complet devient :

```yaml
name: grocery-consolidator
provider: anthropic
model: claude-haiku-4-5-20251001
tools:
  - db-upsert_grocery_list

system_prompt: |
  Tu es spécialiste en consolidation de listes d'épicerie.

  Tu NE génères PAS de recettes. Tu NE cherches PAS sur internet.

  Tu reçois dans ton contexte les outputs de tous les stages du pipeline meal-planner-weekly.
  Les grocery_lists se trouvent dans les outputs des stages "recipe-1" à "recipe-5".
  Pour chaque stage recipe-N, la grocery_list est accessible dans recipe-N.run,
  sous le stage "grocery-list" : { items: [...], sections: {...} }.

  Si recipe-N.status === "error", ignore ce stage (recette manquante, continue avec les autres).

  Si la structure exacte du contexte diffère, cherche les champs `items` et `sections`
  dans chaque entrée recipe-N.run — c'est là que se trouvent les ingrédients à consolider.

  Ton rôle : fusionner toutes les grocery_list en une seule liste consolidée.

  Règles de fusion :
  - Si le même ingrédient apparaît dans plusieurs listes, cumule les quantités (ex: "200g + 300g = 500g")
  - Normalise les noms d'ingrédients (même ingrédient = même name, même group)
  - Regroupe par rayon dans sections

  RÈGLE ABSOLUE : tu appelles db-upsert_grocery_list EXACTEMENT UNE FOIS avec la liste finale.
  Passe planId depuis l'input du pipeline (champ planId).

  Tu produis :
  - items : array consolidé de tous les ingrédients dédupliqués {name, quantity, group}
  - sections : objet groupé par rayon
  - total_items : nombre total d'ingrédients distincts après déduplication (critère d'unicité : name, insensible à la casse) (entier)
  - status : "complete"
```

**Step 2 : Vérifier la syntaxe YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.studio/agents/grocery-consolidator.agent.yaml'))" && echo "OK"
```
Expected : `OK`

---

### Task 12 : Supprimer les fichiers obsolètes

**Files :**
- Delete: `.studio/agents/recipe-orchestrator.agent.yaml`
- Delete: `.studio/contracts/recipe-runs.contract.yaml`

**Step 1 : Supprimer**

```bash
git rm .studio/agents/recipe-orchestrator.agent.yaml
git rm .studio/contracts/recipe-runs.contract.yaml
```

**Step 2 : Vérifier**

```bash
git status
```
Expected : les deux fichiers apparaissent en `deleted`

---

### Task 13 : Build + Commit + PR Little Chef

**Step 1 : Build**

```bash
pnpm build
```
Expected : build réussi sans erreurs TypeScript

**Step 2 : Stager tous les changements**

```bash
git add .studio/pipelines/meal-planner-weekly.pipeline.yaml \
        .studio/agents/meal-orchestrator.agent.yaml \
        .studio/agents/grocery-consolidator.agent.yaml \
        .studio/contracts/recipe-run.contract.yaml
```

**Step 3 : Commit**

```bash
git commit -m "config(studio): STU-211 — parallel group recipe-generation dans meal-planner-weekly

Remplace le stage recipe-runs (orchestration séquentielle) par un group
recipe-generation (mode: parallel, on_failure: collect-all) avec 5 stages
recipe-1 à recipe-5 utilisant l'agent meal-orchestrator.

L'agent meal-orchestrator lit son stage_name pour déterminer son brief
dans weekly_briefs (index N-1 depuis recipe-N).

- Latence : ~15 min → ~3 min
- on_failure: collect-all : 4 recettes retournées si une échoue
- Supprime recipe-orchestrator et recipe-runs.contract

Dépend du fix kernel Studio : stage_name context include.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

**Step 4 : Push + PR**

```bash
git push -u origin arianedguay/stu-211-meal-planner-weekly-migrer-les-5-studio_run-vers-parallel
gh pr create \
  --title "config(studio): STU-211 — parallel group recipe-generation" \
  --body "$(cat <<'EOF'
## Summary
- Remplace `recipe-runs` (orchestration séquentielle, ~15 min) par `group: recipe-generation` (mode: parallel, ~3 min)
- Crée `meal-orchestrator` — agent unique pour les 5 slots, lit son `stage_name` pour choisir son brief
- `on_failure: collect-all` — les 4 recettes réussies retournées même si une échoue
- Met à jour `grocery-consolidator` pour lire `recipe-N.run` au lieu de `recipe-runs.runs[i]`
- Supprime `recipe-orchestrator` et `recipe-runs.contract` (remplacés)

## Prérequis
- PR Studio : `feat/stu-211-stage-name-context-injection` mergée (kernel `stage_name` include)

## Test plan
- [ ] Pipeline YAML valide (syntax check)
- [ ] `meal-orchestrator` extrait correctement N depuis `stage_name` (recipe-1 → index 0)
- [ ] `grocery-consolidator` consolide depuis `recipe-1.run` à `recipe-5.run`
- [ ] Build `pnpm build` passe sans erreurs

Closes STU-211

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main
```

---

## Résumé des fichiers touchés

### Studio (`/home/arianeguay/dev/src/Studio`)
| Fichier | Action |
|---------|--------|
| `runner/src/prompt-builder.ts` | Ajoute `stage_name` à `AgentContext` + rendu |
| `engine/src/pipeline/context-propagation.ts` | Ajoute `case 'stage_name'` |
| `runner/src/prompt-builder.test.ts` | 2 nouveaux tests |
| `engine/tests/unit/context-propagation.test.ts` | Nouveau fichier, 3 tests |

### Little Chef (`/home/arianeguay/dev/src/little-chef-by-studio`)
| Fichier | Action |
|---------|--------|
| `.studio/pipelines/meal-planner-weekly.pipeline.yaml` | Remplace `recipe-runs` par parallel group |
| `.studio/agents/meal-orchestrator.agent.yaml` | **Nouveau** |
| `.studio/contracts/recipe-run.contract.yaml` | **Nouveau** |
| `.studio/agents/grocery-consolidator.agent.yaml` | Met à jour les références de stage |
| `.studio/agents/recipe-orchestrator.agent.yaml` | **Supprimé** |
| `.studio/contracts/recipe-runs.contract.yaml` | **Supprimé** |

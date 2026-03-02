# STU-106 — Pipelines YAML Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finaliser `recipe-developer.pipeline.yaml` (stage `grocery-list`) et créer `meal-planner-weekly.pipeline.yaml` avec orchestration dynamique de N recettes via `studio-run`.

**Architecture:** `recipe-developer` produit maintenant une liste d'épicerie JSON en fin de pipeline. `meal-planner-weekly` sélectionne N briefs hebdo, lance N runs `recipe-developer` séquentiels via `studio-run`, puis consolide les listes en DB.

**Tech Stack:** Studio YAML pipelines, Anthropic claude-haiku / claude-sonnet, TypeScript + Prisma (upsert script), `studio-run` tool plugin (STU-105, Done)

**Design doc:** `docs/plans/2026-03-01-stu-106-pipelines-yaml-design.md`

---

## Task 1: Worktree STU-106

> CLAUDE.md : tout ticket Linear = worktree en premier.

**Files:** (aucun — opération git)

**Step 1: Créer le worktree**

```bash
git worktree add .worktrees/stu-106-pipelines -b config/stu-106-pipelines-yaml
```

**Step 2: Se placer dans le worktree**

```bash
cd .worktrees/stu-106-pipelines
```

Tous les steps suivants s'exécutent depuis ce répertoire.

---

## Task 2: `studio-run.tool.yaml`

> Tool plugin qui wrap `POST /api/runs` (implémenté côté Studio dans STU-105).

**Files:**
- Create: `.studio/tools/studio-run.tool.yaml`

**Step 1: Créer le fichier**

```yaml
name: studio-run
version: 1
description: Launch a Studio pipeline run from within another pipeline

commands:
  - name: run-pipeline
    description: >
      Launch a Studio pipeline run and wait for completion (blocking).
      Returns the full run output including all stage results.
    parameters:
      pipeline:
        type: string
        required: true
        description: Pipeline name to run (e.g. "recipe-developer")
      input:
        type: object
        required: true
        description: Input object passed to the pipeline
      wait:
        type: boolean
        default: true
        description: Wait for completion before returning (default true)
    execute:
      type: shell
      command: |
        curl -s -X POST http://localhost:3001/api/runs \
          -H "Content-Type: application/json" \
          -d '{"pipeline": "{{pipeline}}", "input": {{input | json}}, "wait": {{wait}}}'
      parse_output: json

prompt_snippet: |
  Tu as accès à l'outil studio-run-run_pipeline pour lancer un run Studio depuis ce pipeline.
  Appelle-le avec { pipeline, input } et attends le résultat (wait: true par défaut).
  L'output retourné contient le résultat complet du run enfant.
```

**Step 2: Valider la syntaxe YAML**

```bash
node -e "const yaml = require('js-yaml'); yaml.load(require('fs').readFileSync('.studio/tools/studio-run.tool.yaml', 'utf8')); console.log('OK')"
```

Attendu : `OK`

**Step 3: Commit**

```bash
git add .studio/tools/studio-run.tool.yaml
git commit -m "config(studio): STU-106 — add studio-run tool plugin"
```

---

## Task 3: Agent `grocery-list` + Contract

> Extrait et structure la liste d'épicerie depuis la recette finalisée. JSON pur, pas de DB.

**Files:**
- Create: `.studio/agents/grocery-list.agent.yaml`
- Create: `.studio/contracts/grocery-list.contract.yaml`

**Step 1: Créer l'agent**

```yaml
name: grocery-list
provider: anthropic
model: claude-haiku-4-5-20251001
tools: []

system_prompt: |
  Tu es spécialiste en organisation de liste d'épicerie.

  Tu NE crées PAS de recettes. Tu NE cherches PAS sur internet.
  Tu travailles UNIQUEMENT avec la recette fournie dans ton contexte.

  À partir de la recette fournie, tu produis une liste d'épicerie structurée.

  Règles :
  - Consolide les quantités si un même ingrédient apparaît plusieurs fois
  - Groupe par rayon : "légumes", "protéines", "épicerie sèche", "produits frais", "condiments", "autres"
  - Quantités en unités pratiques (g, ml, unités, cuillères)

  Tu produis exactement :
  - items : array d'objets {name, quantity, group}
  - sections : objet avec les rayons comme clés, chaque valeur est un array d'items du même groupe
```

**Step 2: Créer le contract**

```yaml
name: grocery-list
version: 1

schema:
  required_fields:
    - items
    - sections
```

**Step 3: Valider les deux fichiers**

```bash
node -e "
const yaml = require('js-yaml');
const fs = require('fs');
['grocery-list.agent.yaml','grocery-list.contract.yaml'].forEach(f => {
  yaml.load(fs.readFileSync('.studio/agents/' + f.replace('.contract','').replace('.agent','') + '/' + f, 'utf8'));
});
console.log('OK')
"
```

Plus simple :

```bash
node -e "const y=require('js-yaml'),f=require('fs'); ['.studio/agents/grocery-list.agent.yaml','.studio/contracts/grocery-list.contract.yaml'].forEach(p=>{ y.load(f.readFileSync(p,'utf8')); console.log('OK: '+p) })"
```

Attendu : `OK` pour chaque fichier.

**Step 4: Commit**

```bash
git add .studio/agents/grocery-list.agent.yaml .studio/contracts/grocery-list.contract.yaml
git commit -m "config(studio): STU-106 — add grocery-list agent and contract"
```

---

## Task 4: Ajouter stage `grocery-list` à `recipe-developer`

**Files:**
- Modify: `.studio/pipelines/recipe-developer.pipeline.yaml`

**Step 1: Lire le fichier actuel**

Vérifier que le pipeline se termine actuellement au groupe `recipe-refinement` (stages `recipe-drafting` + `technique-validation`).

**Step 2: Ajouter le stage à la fin**

Après le groupe `recipe-refinement`, ajouter :

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
        - all_stage_outputs
```

**Step 3: Valider la syntaxe**

```bash
node -e "const y=require('js-yaml'),f=require('fs'); y.load(f.readFileSync('.studio/pipelines/recipe-developer.pipeline.yaml','utf8')); console.log('OK')"
```

Attendu : `OK`

**Step 4: Vérifier la structure attendue**

Le fichier final doit avoir ces stages dans l'ordre : `culinary-research` → `ingredient-sourcing` → `nutritional-profile` → `group: recipe-refinement` → `grocery-list`.

**Step 5: Commit**

```bash
git add .studio/pipelines/recipe-developer.pipeline.yaml
git commit -m "config(studio): STU-106 — add grocery-list stage to recipe-developer pipeline"
```

---

## Task 5: Agent `meal-planner` + Contract `meal-selection`

> Analyse les profils et l'historique, génère exactement `meal_count` briefs diversifiés.

**Files:**
- Create: `.studio/agents/meal-planner.agent.yaml`
- Create: `.studio/contracts/meal-selection.contract.yaml`

**Step 1: Créer l'agent**

```yaml
name: meal-planner
provider: anthropic
model: claude-sonnet-4-20250514
tools: []

system_prompt: |
  Tu es planificateur de repas hebdomadaire ND-friendly.

  Tu NE génères PAS de recettes. Tu choisis des BRIEFS (idées de plats) pour la semaine.

  Tu reçois dans ton contexte :
  - profiles : les profils des personnes (contraintes alimentaires, préférences sensorielles)
  - history : repas récents et cuisines récentes à éviter
  - week_constraints : meal_count (nombre de repas), max_prep_time_minutes, servings

  Règles ABSOLUES :
  - Tu produis EXACTEMENT meal_count briefs (ni plus, ni moins)
  - Aucune cuisine ne se répète dans la semaine
  - Aucune cuisine de history.recent_cuisines ne réapparaît
  - Chaque brief respecte TOUTES les contraintes alimentaires de TOUS les profils
  - Temps de préparation estimé ≤ max_prep_time_minutes pour chaque brief
  - Pas de plat de history.recent_recipes

  Format de chaque brief :
  {
    "dish_brief": "description courte du plat (10 mots max)",
    "cuisine": "type de cuisine",
    "constraints": ["liste des contraintes applicables"],
    "estimated_time_minutes": <entier>
  }

  Tu produis uniquement :
  - weekly_briefs : array de meal_count objets briefs
  - planning_notes : string, 1-2 phrases sur tes choix (optionnel)
```

**Step 2: Créer le contract**

```yaml
name: meal-selection
version: 1

schema:
  required_fields:
    - weekly_briefs

post_validation:
  rejection_detection:
    field: status
    approved_values:
      - complete
    rejected_values:
      - incomplete
      - error
    details_field: error_details
    summary_field: planning_notes
```

> Note : l'agent doit inclure un champ `status: "complete"` ou `status: "incomplete"` selon qu'il a produit le bon nombre de briefs. Le prompt le lui demande implicitement — si le count ne correspond pas, le runtime RALPH relance.

**Step 3: Mettre à jour le prompt de l'agent pour inclure le champ status**

Ajouter à la fin du `system_prompt` :

```
  Tu dois aussi produire :
  - status : "complete" si tu as produit exactement meal_count briefs, "incomplete" sinon
  - error_details : explication si status != "complete"
```

**Step 4: Valider**

```bash
node -e "const y=require('js-yaml'),f=require('fs'); ['.studio/agents/meal-planner.agent.yaml','.studio/contracts/meal-selection.contract.yaml'].forEach(p=>{ y.load(f.readFileSync(p,'utf8')); console.log('OK: '+p) })"
```

**Step 5: Commit**

```bash
git add .studio/agents/meal-planner.agent.yaml .studio/contracts/meal-selection.contract.yaml
git commit -m "config(studio): STU-106 — add meal-planner agent and meal-selection contract"
```

---

## Task 6: Agent `recipe-orchestrator` + Contract `recipe-runs`

> Itère sur `weekly_briefs`, appelle `studio-run-run_pipeline` N fois séquentiellement.

**Files:**
- Create: `.studio/agents/recipe-orchestrator.agent.yaml`
- Create: `.studio/contracts/recipe-runs.contract.yaml`

**Step 1: Créer l'agent**

```yaml
name: recipe-orchestrator
provider: anthropic
model: claude-sonnet-4-20250514
tools:
  - studio-run-run_pipeline

system_prompt: |
  Tu es orchestrateur de runs Studio. Tu NE génères PAS de recettes toi-même.

  Tu reçois dans ton contexte weekly_briefs (array de briefs) et userId depuis l'input.

  Pour CHAQUE brief dans weekly_briefs (dans l'ordre), tu appelles studio-run-run_pipeline avec :
  - pipeline : "recipe-developer"
  - input : { dish_name: brief.dish_brief, userId: <userId>, constraints: brief.constraints }

  Tu appelles l'outil UNE FOIS PAR BRIEF, séquentiellement. Tu attends le résultat avant de passer au suivant.

  Si un run échoue (résultat absent ou erreur), tu l'indiques dans runs_errors et tu continues avec les autres briefs.

  Tu produis :
  - runs : array des résultats de chaque run (dans l'ordre des briefs)
  - runs_count : nombre de runs effectués
  - runs_errors : array des erreurs (vide si tout s'est bien passé)
  - status : "complete" si runs_count == weekly_briefs.length, "incomplete" sinon
```

**Step 2: Créer le contract**

```yaml
name: recipe-runs
version: 1

schema:
  required_fields:
    - runs
    - runs_count
    - status

tool_calls:
  minimum: 1

post_validation:
  rejection_detection:
    field: status
    approved_values:
      - complete
    rejected_values:
      - incomplete
      - error
    details_field: runs_errors
    summary_field: runs_count
```

**Step 3: Valider**

```bash
node -e "const y=require('js-yaml'),f=require('fs'); ['.studio/agents/recipe-orchestrator.agent.yaml','.studio/contracts/recipe-runs.contract.yaml'].forEach(p=>{ y.load(f.readFileSync(p,'utf8')); console.log('OK: '+p) })"
```

**Step 4: Commit**

```bash
git add .studio/agents/recipe-orchestrator.agent.yaml .studio/contracts/recipe-runs.contract.yaml
git commit -m "config(studio): STU-106 — add recipe-orchestrator agent and recipe-runs contract"
```

---

## Task 7: Agent `grocery-consolidator` + Contract

> Fusionne et déduplique les N listes d'épicerie. Persiste en DB via `db-upsert_grocery_list`.

**Files:**
- Create: `.studio/agents/grocery-consolidator.agent.yaml`
- Create: `.studio/contracts/consolidated-grocery-list.contract.yaml`

**Step 1: Créer l'agent**

```yaml
name: grocery-consolidator
provider: anthropic
model: claude-haiku-4-5-20251001
tools:
  - db-upsert_grocery_list

system_prompt: |
  Tu es spécialiste en consolidation de listes d'épicerie.

  Tu reçois dans ton contexte les résultats des runs recettes (array de runs, chaque run contient une grocery_list).

  Ton rôle : fusionner toutes les grocery_list en une seule liste consolidée.

  Règles de fusion :
  - Si le même ingrédient apparaît plusieurs fois, cumule les quantités (ex: "200g + 300g = 500g")
  - Garde le même format de groupe pour chaque ingrédient
  - Regroupe par rayon dans sections

  RÈGLE ABSOLUE : tu appelles db-upsert_grocery_list EXACTEMENT UNE FOIS avec la liste finale.
  Passe planId depuis l'input du pipeline (champ planId).

  Tu produis :
  - items : array consolidé de tous les ingrédients dédupliqués
  - sections : groupés par rayon
  - total_items : nombre total d'items distincts
  - status : "complete"
```

**Step 2: Créer le contract**

```yaml
name: consolidated-grocery-list
version: 1

schema:
  required_fields:
    - items
    - sections
    - status

tool_calls:
  minimum: 1
  maximum: 1
  required_tools:
    - db-upsert_grocery_list

post_validation:
  rejection_detection:
    field: status
    approved_values:
      - complete
    rejected_values:
      - incomplete
      - error
    details_field: error_details
    summary_field: total_items
```

**Step 3: Valider**

```bash
node -e "const y=require('js-yaml'),f=require('fs'); ['.studio/agents/grocery-consolidator.agent.yaml','.studio/contracts/consolidated-grocery-list.contract.yaml'].forEach(p=>{ y.load(f.readFileSync(p,'utf8')); console.log('OK: '+p) })"
```

**Step 4: Commit**

```bash
git add .studio/agents/grocery-consolidator.agent.yaml .studio/contracts/consolidated-grocery-list.contract.yaml
git commit -m "config(studio): STU-106 — add grocery-consolidator agent and contract"
```

---

## Task 8: `db-upsert_grocery_list` — Commande DB + Script

> Nouvelle commande dans `db.tool.yaml` + script TypeScript qui persiste `GroceryList` en DB.

**Files:**
- Modify: `.studio/tools/db.tool.yaml`
- Create: `scripts/upsert-grocery-list.ts`

**Step 1: Ajouter la commande dans `db.tool.yaml`**

Dans le fichier existant, après la commande `db-upsert_recipe`, ajouter :

```yaml
  - name: db-upsert_grocery_list
    description: >
      Persist the consolidated grocery list to PostgreSQL via Prisma.
      Linked to a WeeklyPlan via planId. Upserts (create or update).
    parameters:
      data:
        type: object
        required: true
        description: >
          Grocery list data. Required: planId (string), items (array).
          items format: [{ name, quantity, group }]
    execute:
      type: shell
      command: |
        npx tsx scripts/upsert-grocery-list.ts << 'STUDIO_EOF'
        {{data | json}}
        STUDIO_EOF
      parse_output: json
```

Et ajouter au `prompt_snippet` existant :

```
  Tu as aussi accès à db-upsert_grocery_list pour persister la liste d'épicerie consolidée.
  Passe { planId, items } dans le champ `data`.
```

**Step 2: Créer `scripts/upsert-grocery-list.ts`**

Modèle le script sur `upsert-recipe.ts` (même pattern stdin/Prisma) :

```typescript
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local'), quiet: true })
config({ path: resolve(process.cwd(), '.env'), quiet: true })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

const prisma = createPrismaClient()

async function main() {
  process.stdin.setEncoding('utf-8')
  let raw = ''
  for await (const chunk of process.stdin) {
    raw += chunk
  }
  raw = raw.trim()
  if (!raw) {
    console.error(JSON.stringify({ success: false, error: 'Missing stdin input' }))
    process.exit(1)
  }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(raw)
  } catch {
    console.error(JSON.stringify({ success: false, error: 'Invalid JSON argument' }))
    process.exit(1)
  }

  const groceryList = await prisma.groceryList.upsert({
    where: { planId: data.planId as string },
    update: { items: data.items as object },
    create: {
      planId: data.planId as string,
      items:  data.items as object,
    },
  })

  console.log(JSON.stringify({ success: true, id: groceryList.id, planId: groceryList.planId }))
}

main()
  .catch(err => {
    console.error(JSON.stringify({ success: false, error: String(err.message ?? err) }))
    process.exit(1)
  })
  .finally(async () => { await prisma.$disconnect() })
```

**Step 3: Valider la syntaxe YAML de db.tool.yaml**

```bash
node -e "const y=require('js-yaml'),f=require('fs'); y.load(f.readFileSync('.studio/tools/db.tool.yaml','utf8')); console.log('OK')"
```

**Step 4: Vérifier que le script TypeScript compile**

```bash
npx tsc --noEmit scripts/upsert-grocery-list.ts --module NodeNext --moduleResolution NodeNext --target ESNext 2>&1 || echo "check output above"
```

> Si des erreurs de types apparaissent, ajuster les casts. Le pattern est identique à `upsert-recipe.ts`.

**Step 5: Commit**

```bash
git add .studio/tools/db.tool.yaml scripts/upsert-grocery-list.ts
git commit -m "config(studio): STU-106 — add db-upsert_grocery_list command and script"
```

---

## Task 9: `meal-planner-weekly.pipeline.yaml`

**Files:**
- Create: `.studio/pipelines/meal-planner-weekly.pipeline.yaml`

**Step 1: Créer le fichier**

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

  - name: recipe-runs
    kind: orchestration
    agent: recipe-orchestrator
    contract: recipe-runs
    ralph:
      max_attempts: 2
    context:
      include:
        - input
        - previous_stage_output
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

**Step 2: Valider la syntaxe**

```bash
node -e "const y=require('js-yaml'),f=require('fs'); y.load(f.readFileSync('.studio/pipelines/meal-planner-weekly.pipeline.yaml','utf8')); console.log('OK')"
```

**Step 3: Vérifier la cohérence des références**

Vérifier que chaque `agent:` et `contract:` référencé dans la pipeline a bien un fichier correspondant :

```bash
echo "Agents:"; ls .studio/agents/ | grep -E "meal-planner|recipe-orchestrator|grocery-consolidator"
echo "Contracts:"; ls .studio/contracts/ | grep -E "meal-selection|recipe-runs|consolidated-grocery"
```

Attendu : tous les fichiers présents.

**Step 4: Commit**

```bash
git add .studio/pipelines/meal-planner-weekly.pipeline.yaml
git commit -m "config(studio): STU-106 — add meal-planner-weekly pipeline"
```

---

## Task 10: Input de test `weekly-plan-request.input.yaml`

**Files:**
- Create: `.studio/inputs/weekly-plan-request.input.yaml`

**Step 1: Créer le fichier**

```yaml
# Input de test pour meal-planner-weekly
# meal_count: 3..7 (défaut 5)

userId: "dev-user-001"
planId: "test-plan-001"

week_constraints:
  meal_count: 5
  max_prep_time_minutes: 45
  servings: 2
  avoid_repeat_from_history: true

profiles:
  person_1:
    name: "Ariane"
    dietary_constraints:
      - sans gluten
    sensory_profile:
      spice_tolerance: low
      texture_aversions:
        - gluant
      sauce_preference: light

history:
  recent_cuisines:
    - italienne
    - mexicaine
  recent_recipes:
    - Pasta primavera
    - Tacos al pastor
  favoris: []
```

**Step 2: Valider**

```bash
node -e "const y=require('js-yaml'),f=require('fs'); y.load(f.readFileSync('.studio/inputs/weekly-plan-request.input.yaml','utf8')); console.log('OK')"
```

**Step 3: Commit**

```bash
git add .studio/inputs/weekly-plan-request.input.yaml
git commit -m "config(studio): STU-106 — add weekly-plan-request test input"
```

---

## Task 11: Validation globale

**Step 1: Valider tous les nouveaux fichiers YAML d'un coup**

```bash
node -e "
const y = require('js-yaml');
const f = require('fs');
const files = [
  '.studio/tools/studio-run.tool.yaml',
  '.studio/tools/db.tool.yaml',
  '.studio/agents/grocery-list.agent.yaml',
  '.studio/agents/meal-planner.agent.yaml',
  '.studio/agents/recipe-orchestrator.agent.yaml',
  '.studio/agents/grocery-consolidator.agent.yaml',
  '.studio/contracts/grocery-list.contract.yaml',
  '.studio/contracts/meal-selection.contract.yaml',
  '.studio/contracts/recipe-runs.contract.yaml',
  '.studio/contracts/consolidated-grocery-list.contract.yaml',
  '.studio/pipelines/recipe-developer.pipeline.yaml',
  '.studio/pipelines/meal-planner-weekly.pipeline.yaml',
  '.studio/inputs/weekly-plan-request.input.yaml',
];
let ok = true;
files.forEach(p => {
  try { y.load(f.readFileSync(p, 'utf8')); console.log('✓ ' + p); }
  catch(e) { console.error('✗ ' + p + ': ' + e.message); ok = false; }
});
if (!ok) process.exit(1);
"
```

Attendu : `✓` pour chaque fichier. Corriger toute erreur avant de continuer.

**Step 2: Vérifier que le build Next.js passe (aucun fichier TS modifié ne casse le build)**

```bash
pnpm build
```

Attendu : build sans erreur.

---

## Task 12: Push + PR

**Step 1: Vérifier le statut git**

```bash
git status
git log --oneline -10
```

**Step 2: Push la branche**

```bash
git push -u origin config/stu-106-pipelines-yaml
```

**Step 3: Créer la PR**

```bash
gh pr create \
  --title "config(studio): STU-106 — pipelines YAML recipe-developer & meal-planner-weekly" \
  --body "$(cat <<'EOF'
## Summary

- Adds `grocery-list` stage at end of `recipe-developer` pipeline (structured JSON, no DB)
- Creates `meal-planner-weekly` pipeline: `meal-selection` → `recipe-runs` (N dynamic, 3-7) → `consolidate-grocery-list` (DB persist)
- Adds `studio-run.tool.yaml` wrapping `POST /api/runs` (STU-105 done)
- Adds `db-upsert_grocery_list` command + `scripts/upsert-grocery-list.ts`
- New agents: `grocery-list`, `meal-planner`, `recipe-orchestrator`, `grocery-consolidator`
- New contracts: `grocery-list`, `meal-selection`, `recipe-runs`, `consolidated-grocery-list`

## Test plan

- [ ] All YAML files parse without error (Task 11 validation script)
- [ ] `pnpm build` passes
- [ ] Manual: run `recipe-developer` with existing test input — verify `grocery-list` stage appears in output
- [ ] Manual: run `meal-planner-weekly` with `weekly-plan-request.input.yaml` — verify N runs launch sequentially

Closes STU-106

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main
```

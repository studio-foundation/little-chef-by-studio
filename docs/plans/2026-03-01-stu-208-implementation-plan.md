# STU-208 DB Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer l'écriture Markdown des recettes par une persistance PostgreSQL via Prisma, en ajoutant un contract `recipe-output` et un shell tool `db-upsert_recipe`.

**Architecture:** Shell tool dans little-chef (`execute.type: shell`) qui appelle `npx tsx scripts/upsert-recipe.ts '<json>'`. Le Studio runner reste Prisma-free et domain-agnostic (INV-04/INV-05 respectés). Un seul argument JSON est passé au script pour éviter les problèmes de quoting.

**Tech Stack:** Prisma 7 (`@prisma/client`), tsx, YAML Studio contracts/tools, Next.js/pnpm

**Design doc:** `docs/plans/2026-03-01-stu-208-db-persistence-design.md`

---

## Pre-flight — Worktree

**Step 1: Créer le worktree**

```bash
git worktree add .worktrees/stu-208 -b feat/stu-208-db-persistence
cd .worktrees/stu-208
```

Toute la suite se passe dans `.worktrees/stu-208/`.

---

## Task 1: Ajouter tsx comme dépendance

**Files:**
- Modify: `package.json`

**Step 1: Ajouter tsx**

```bash
pnpm add -D tsx
```

**Step 2: Vérifier l'installation**

```bash
npx tsx --version
```

Expected: un numéro de version (ex: `4.x.x`).

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add tsx devDependency for Prisma scripts"
```

---

## Task 2: Script `scripts/upsert-recipe.ts`

**Files:**
- Create: `scripts/upsert-recipe.ts`

Le script reçoit un JSON en `process.argv[2]`, appelle `prisma.recipe.create()`, et retourne un JSON `{ success, id, title }` sur stdout.

**Step 1: Créer le dossier scripts**

```bash
mkdir -p scripts
```

**Step 2: Écrire le script**

Créer `scripts/upsert-recipe.ts` :

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const raw = process.argv[2]
  if (!raw) {
    console.error(JSON.stringify({ success: false, error: 'Missing JSON argument' }))
    process.exit(1)
  }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(raw)
  } catch {
    console.error(JSON.stringify({ success: false, error: 'Invalid JSON argument' }))
    process.exit(1)
  }

  const recipe = await prisma.recipe.create({
    data: {
      userId:      data.userId as string,
      title:       data.title as string,
      cuisine:     data.cuisine as string,
      timeMinutes: data.timeMinutes as number ?? null,
      portions:    data.portions as number ?? null,
      emoji:       data.emoji as string ?? null,
      calories:    data.calories as number ?? null,
      ingredients: data.ingredients as object,
      steps:       data.steps as object,
      notes:       data.notes as object ?? null,
    }
  })

  console.log(JSON.stringify({ success: true, id: recipe.id, title: recipe.title }))
}

main()
  .catch(err => {
    console.error(JSON.stringify({ success: false, error: String(err.message ?? err) }))
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

**Step 3: Tester le script manuellement**

S'assurer que `DATABASE_URL` est dans `.env`. Puis :

```bash
npx tsx scripts/upsert-recipe.ts '{"userId":"dev-user-001","title":"Test recette","cuisine":"française","timeMinutes":30,"portions":4,"emoji":"🥗","ingredients":[{"name":"salade","quantity":"1 tête"}],"steps":[{"order":1,"title":"Préparer","instructions":["Laver la salade"]}],"notes":{"chef":["Servir frais"]}}'
```

Expected output (JSON sur stdout) :
```json
{ "success": true, "id": "clxxx...", "title": "Test recette" }
```

**Step 4: Vérifier en DB**

```bash
npx prisma studio
```

La recette "Test recette" doit apparaître dans la table `Recipe`.

**Step 5: Commit**

```bash
git add scripts/upsert-recipe.ts
git commit -m "feat(db): add upsert-recipe script (Prisma + tsx)"
```

---

## Task 3: Contract `recipe-output.contract.yaml`

**Files:**
- Create: `.studio/contracts/recipe-output.contract.yaml`

**Step 1: Créer le contract**

Créer `.studio/contracts/recipe-output.contract.yaml` :

```yaml
name: recipe-output
version: 1

schema:
  required_fields:
    - title
    - cuisine
    - timeMinutes
    - portions
    - emoji
    - ingredients
    - steps
    - notes

tool_calls:
  minimum: 1
  required_tools:
    - db-upsert_recipe
```

**Step 2: Vérifier la syntaxe YAML**

```bash
npx js-yaml .studio/contracts/recipe-output.contract.yaml 2>&1 && echo "OK"
```

Expected: `OK` (pas d'erreur de parsing).

**Step 3: Commit**

```bash
git add .studio/contracts/recipe-output.contract.yaml
git commit -m "config(studio): add recipe-output contract"
```

---

## Task 4: Tool `db.tool.yaml`

**Files:**
- Create: `.studio/tools/db.tool.yaml`

**Step 1: Créer le tool**

Créer `.studio/tools/db.tool.yaml` :

```yaml
name: db
version: 1
description: Database persistence tools for Little Chef

commands:
  - name: db-upsert_recipe
    description: >
      Persist a generated recipe to PostgreSQL via Prisma.
      Call this tool once per recipe with all recipe data in the `data` field.
    parameters:
      data:
        type: object
        required: true
        description: >
          Full recipe data to persist. Required: userId (string), title (string),
          cuisine (string), timeMinutes (integer), portions (integer),
          emoji (string), ingredients (array), steps (array), notes (object).
          Optional: calories (integer).
          ingredients format: [{ name, quantity, group?, optional? }]
          steps format: [{ order, title, instructions[], durationMinutes? }]
          notes format: { chef[], variations[], conservation?, nutrition? }
    execute:
      type: shell
      command: "npx tsx scripts/upsert-recipe.ts '{{data | json}}'"
      parse_output: json

prompt_snippet: |
  Tu as accès à l'outil db-upsert_recipe pour persister les recettes générées en base de données.
  Tu DOIS appeler cet outil pour chaque recette générée. Ne retourne JAMAIS du Markdown.
  Passe toutes les données de la recette dans le champ `data` sous forme d'objet structuré.
  userId : récupère-le depuis l'input du pipeline (champ userId).
  ingredients format : [{ name, quantity, group?, optional? }]
  steps format : [{ order, title, instructions[], durationMinutes? }]
  notes format : { chef[], variations[], conservation?, nutrition? }
```

**Step 2: Vérifier la syntaxe YAML**

```bash
npx js-yaml .studio/tools/db.tool.yaml 2>&1 && echo "OK"
```

Expected: `OK`.

**Step 3: Commit**

```bash
git add .studio/tools/db.tool.yaml
git commit -m "config(studio): add db-upsert_recipe shell tool"
```

---

## Task 5: Mettre à jour le pipeline

**Files:**
- Modify: `.studio/pipelines/recipe-developer.pipeline.yaml`

**Step 1: Lire le fichier actuel**

Lire `.studio/pipelines/recipe-developer.pipeline.yaml` pour bien identifier les lignes à modifier.

**Step 2: Modifier le stage `recipe-drafting`**

Dans le groupe `recipe-refinement`, stage `recipe-drafting` :

Changer :
```yaml
      - name: recipe-drafting
        kind: creation
        agent: recipe-writer
        contract: recipe-drafting        # ← changer
        ralph:
          max_attempts: 5
        context:
          include:
            - input
            - all_stage_outputs
            - group_feedback
        tools:
          required:
            - repo_manager-write_file    # ← changer
```

En :
```yaml
      - name: recipe-drafting
        kind: creation
        agent: recipe-writer
        contract: recipe-output          # ← nouveau contract
        ralph:
          max_attempts: 5
        context:
          include:
            - input
            - all_stage_outputs
            - group_feedback
        tools:
          required:
            - db-upsert_recipe           # ← nouveau tool
```

**Step 3: Vérifier la syntaxe YAML**

```bash
npx js-yaml .studio/pipelines/recipe-developer.pipeline.yaml 2>&1 && echo "OK"
```

Expected: `OK`.

**Step 4: Commit**

```bash
git add .studio/pipelines/recipe-developer.pipeline.yaml
git commit -m "config(studio): update recipe-drafting stage to use recipe-output contract + db tool"
```

---

## Task 6: Mettre à jour l'input pipeline

**Files:**
- Modify: `.studio/inputs/recipe-request.input.yaml`

**Step 1: Modifier l'input**

Changer :
```yaml
dish_name: "Ramen tonkotsu végétalien"
constraints:
  - sans produits animaux
  - temps de préparation max 90 minutes
  - pour 4 personnes
output_path: "src/recipes/"
```

En :
```yaml
dish_name: "Ramen tonkotsu végétalien"
userId: "dev-user-001"
constraints:
  - sans produits animaux
  - temps de préparation max 90 minutes
  - pour 4 personnes
```

(`output_path` supprimé, `userId` ajouté)

**Step 2: Commit**

```bash
git add .studio/inputs/recipe-request.input.yaml
git commit -m "config(studio): add userId to pipeline input, remove output_path"
```

---

## Task 7: Test end-to-end

**Step 1: Démarrer l'environnement**

S'assurer que :
- `DATABASE_URL` est configuré dans `.env`
- La DB est accessible et les migrations appliquées (`npx prisma migrate deploy` ou `npx prisma db push`)

**Step 2: Lancer un run de pipeline**

```bash
# Depuis le dossier Studio (runner/api)
cd /home/arianeguay/dev/src/Studio
studio run recipe-developer --project little-chef
```

Ou via l'API HTTP si le Studio API tourne :
```bash
curl -X POST http://localhost:3001/api/runs \
  -H "Content-Type: application/json" \
  -d '{"pipeline": "recipe-developer", "input": {"dish_name": "Soupe miso", "userId": "dev-user-001", "constraints": ["végétalien", "30 minutes"]}}'
```

**Step 3: Vérifier la persistance DB**

```bash
cd /home/arianeguay/dev/src/little-chef-by-studio
npx prisma studio
```

La recette générée doit apparaître dans la table `Recipe` avec tous les champs remplis.

**Step 4: Vérifier que les fichiers Markdown ne sont plus écrits**

```bash
ls src/recipes/
```

Aucun nouveau fichier `.md` ne doit avoir été créé lors de ce run.

**Step 5: Commit final si tout est OK**

```bash
git add -A
git commit -m "feat(db): STU-208 — complete DB persistence for recipes via shell tool"
```

---

## Task 8: Push + PR

**Step 1: Build**

```bash
pnpm build
```

S'assurer qu'il n'y a pas d'erreur de compilation.

**Step 2: Push**

```bash
git push -u origin feat/stu-208-db-persistence
```

**Step 3: Créer la PR**

```bash
gh pr create \
  --title "feat(db): STU-208 — db-upsert_recipe tool + recipe-output contract" \
  --body "$(cat <<'EOF'
## Summary

- Nouveau contract \`recipe-output\` : exige JSON structuré + appel \`db-upsert_recipe\`
- Nouveau tool \`db.tool.yaml\` : shell tool qui appelle \`scripts/upsert-recipe.ts\` via tsx
- Script \`upsert-recipe.ts\` : persiste la recette en DB via \`prisma.recipe.create()\`
- Pipeline \`recipe-developer\` mis à jour : stage \`recipe-drafting\` utilise le nouveau contract + tool
- Les fichiers Markdown ne sont plus écrits

Le Studio runner reste Prisma-free et domain-agnostic (INV-04/INV-05 respectés).

## Test plan

- [ ] `npx tsx scripts/upsert-recipe.ts '<json>'` crée une recette en DB
- [ ] `npx prisma studio` montre la recette persistée
- [ ] Un run complet du pipeline persiste la recette (pas de fichier Markdown créé)
- [ ] `pnpm build` passe sans erreur

Closes STU-208
EOF
)" \
  --base main
```

---

## Checklist finale (critères d'acceptation STU-208)

- [ ] Contract `recipe-output.contract.yaml` créé dans `.studio/contracts/`
- [ ] Tool `db.tool.yaml` créé dans `.studio/tools/`
- [ ] Script `scripts/upsert-recipe.ts` créé et fonctionnel
- [ ] Stage `recipe-drafting` mis à jour (contract `recipe-output` + tool `db-upsert_recipe`)
- [ ] `userId` ajouté à l'input pipeline, `output_path` supprimé
- [ ] `tsx` ajouté en devDependency
- [ ] Un run complet persiste une recette en DB (vérifié via `prisma studio`)
- [ ] Aucun fichier Markdown n'est créé lors d'un run
- [ ] `pnpm build` passe
- [ ] PR créée et pointée vers `main`

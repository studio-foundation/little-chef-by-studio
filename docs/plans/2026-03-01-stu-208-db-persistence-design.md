# STU-208 — DB Persistence Design
## Tool `db-upsert_recipe` + Contract `recipe-output`

**Date:** 2026-03-01
**Ticket:** [STU-208](https://linear.app/studioag/issue/STU-208)
**Dépend de:** STU-207 (schema Prisma — fait)
**Bloque:** STU-209 (pipeline WeeklyPlan)

---

## Problème

Le pipeline `recipe-developer` écrit les recettes en fichiers Markdown via `repo_manager-write_file`. Il faut les persister en DB PostgreSQL via Prisma.

---

## Décisions d'architecture

### Approche retenue : Shell tool dans little-chef (pas de builtin dans le runner)

Le Studio runner reste **Prisma-free** et **domain-agnostic**. Plutôt qu'un builtin TypeScript dans `@studio/runner`, on utilise un shell tool (`execute.type: shell`) qui appelle un script `tsx` dans little-chef.

Flux :
```
agent recipe-writer
  → appelle db-upsert_recipe (tool shell)
  → runner exécute: npx tsx scripts/upsert-recipe.ts '<json>'
  → script Prisma → DB PostgreSQL
```

**Pourquoi pas un builtin runner ?**
- Le runner (`@studio/runner`) n'a pas `@prisma/client` comme dépendance
- Ajouter Prisma au runner le couplerait au schema de little-chef (violation de l'esprit d'INV-04/INV-10)
- Le shell tool est suffisant et garde la séparation propre

**Passage des paramètres :** Un seul argument JSON (`{{data | json}}`), lu via `process.argv[2]`. Évite les problèmes de quotes avec les caractères spéciaux dans les noms d'ingrédients.

**userId :** Ajouté à l'input du pipeline (`recipe-request.input.yaml`). L'agent le passe dans `data.userId`.

---

## Fichiers à créer / modifier

### Créer

| Fichier | Description |
|---------|-------------|
| `.studio/contracts/recipe-output.contract.yaml` | Contract du stage de génération — exige JSON structuré + appel db-upsert_recipe |
| `.studio/tools/db.tool.yaml` | Tool shell — appelle scripts/upsert-recipe.ts |
| `scripts/upsert-recipe.ts` | Script Prisma — reçoit le JSON, appelle prisma.recipe.create() |

### Modifier

| Fichier | Changement |
|---------|------------|
| `.studio/inputs/recipe-request.input.yaml` | Ajouter `userId`, supprimer `output_path` |
| `.studio/pipelines/recipe-developer.pipeline.yaml` | Stage `recipe-drafting` : contract → `recipe-output`, tool → `db-upsert_recipe` |
| `package.json` | Ajouter `tsx` en devDependency |

---

## Specs détaillées

### `.studio/contracts/recipe-output.contract.yaml`

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

### `.studio/tools/db.tool.yaml`

```yaml
name: db
version: 1
description: Database persistence tools for Little Chef

commands:
  - name: db-upsert_recipe
    description: Persist a generated recipe to PostgreSQL via Prisma
    parameters:
      data:
        type: object
        required: true
        description: >
          Full recipe data to persist.
          Required fields: userId, title, cuisine, timeMinutes (int), portions (int),
          emoji (string), ingredients (array), steps (array), notes (object).
          Optional: calories (int).
          Format ingredients: [{ name, quantity, group?, optional? }]
          Format steps: [{ order, title, instructions[], durationMinutes? }]
          Format notes: { chef[], variations[], conservation?, nutrition? }
    execute:
      type: shell
      command: "npx tsx scripts/upsert-recipe.ts '{{data | json}}'"
      parse_output: json

prompt_snippet: |
  Tu as accès à l'outil db-upsert_recipe pour persister les recettes générées en base de données.
  Tu DOIS appeler cet outil pour chaque recette générée. Ne retourne JAMAIS du Markdown.
  Passe toutes les données de la recette dans le champ `data` sous forme d'objet structuré.
  userId : récupère-le depuis l'input du pipeline.
  Format ingredients : [{ name, quantity, group?, optional? }]
  Format steps : [{ order, title, instructions[], durationMinutes? }]
  Format notes : { chef[], variations[], conservation?, nutrition? }
```

### `scripts/upsert-recipe.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const data = JSON.parse(process.argv[2])

const recipe = await prisma.recipe.create({
  data: {
    userId:      data.userId,
    title:       data.title,
    cuisine:     data.cuisine,
    timeMinutes: data.timeMinutes,
    portions:    data.portions,
    emoji:       data.emoji ?? null,
    calories:    data.calories ?? null,
    ingredients: data.ingredients,
    steps:       data.steps,
    notes:       data.notes ?? null,
  }
})

console.log(JSON.stringify({ success: true, id: recipe.id, title: recipe.title }))
await prisma.$disconnect()
```

### Mise à jour `recipe-developer.pipeline.yaml` — stage `recipe-drafting`

```yaml
# Avant:
- name: recipe-drafting
  contract: recipe-drafting
  tools:
    required:
      - repo_manager-write_file

# Après:
- name: recipe-drafting
  contract: recipe-output
  tools:
    required:
      - db-upsert_recipe
```

### Mise à jour `recipe-request.input.yaml`

```yaml
# Avant:
dish_name: "Ramen tonkotsu végétalien"
constraints: [...]
output_path: "src/recipes/"

# Après:
dish_name: "Ramen tonkotsu végétalien"
userId: "dev-user-001"
constraints: [...]
# output_path supprimé
```

---

## Critères d'acceptation (depuis STU-208)

- [ ] Contract `recipe-output.contract.yaml` créé dans `.studio/contracts/`
- [ ] Tool `db.tool.yaml` créé dans `.studio/tools/`
- [ ] Script `scripts/upsert-recipe.ts` créé et fonctionnel
- [ ] Stage `recipe-drafting` mis à jour (contract + tool)
- [ ] `userId` ajouté à l'input pipeline
- [ ] `tsx` ajouté en devDependency
- [ ] Un run complet du pipeline persiste une recette en DB (vérifiable via `prisma studio`)
- [ ] Les fichiers Markdown ne sont plus écrits

---

## Notes

- Le Studio runner reste inchangé — INV-04/INV-05 respectés
- Le modèle Prisma `Recipe` dans little-chef n'a pas de contrainte `upsert` (pas de champ unique autre que `id`) — on utilise `create` pour l'instant. STU-209 ajoutera la liaison `WeeklyPlan`.
- `DATABASE_URL` doit être configuré dans `.env` de little-chef (déjà requis par STU-207)

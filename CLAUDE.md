# CLAUDE.md — Little Chef

Little Chef est un meal planner hebdomadaire ND-friendly propulsé par Studio. Il génère 5 repas par semaine selon des profils personnalisés (contraintes alimentaires, temps, portions, préférences sensorielles).

**Positionnement :** Valide le domain-agnostic du kernel Studio sur un domaine culinaire — premier test de l'API et d'une interface Next.js grand public.

## Stack technique

```
Next.js 16 (App Router)
React 19
TypeScript 5
Tailwind v4
Prisma (DB — à venir)
pnpm
```

**Runtime Studio :** Little Chef consomme `@studio/api` via HTTP. Les pipelines tournent côté Studio, Little Chef déclenche via `POST /api/runs` et écoute via SSE (`GET /api/runs/:id/stream`).

## Structure du projet

```
little-chef-by-studio/
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── components/               # Composants partagés
├── src/
│   └── components/               # Composants métier
├── .studio/                      # Configs Studio (pipelines, agents, contracts)
│   ├── pipelines/
│   │   ├── recipe-developer.pipeline.yaml
│   │   └── meal-planner-weekly.pipeline.yaml
│   ├── agents/
│   ├── contracts/
│   └── inputs/
├── prisma/                       # Schema DB (à venir)
├── public/
├── next.config.ts
├── package.json
└── CLAUDE.md
```

## Routes

| Route | Vue |
|-------|-----|
| `/onboarding` | Collecte du profil utilisateur (multi-étapes, ND-friendly) |
| `/generate` | Génération hebdomadaire live (SSE, 5 cards se remplissent) |
| `/recipes` | Vue des 5 recettes générées |
| `/grocery-list` | Liste d'épicerie consolidée et déduplicée |
| `/history` | Historique des semaines passées |

## Pipelines Studio

### `recipe-developer.pipeline.yaml`

```
culinary-research
  → ingredient-sourcing
  → nutritional-profile
  → group: recipe-refinement (max 3 itérations)
      → recipe-drafting
      → technique-validation
  → multi-version-adaptation   (3 versions : personne 1, personne 2, animal)
  → grocery-list
```

### `meal-planner-weekly.pipeline.yaml`

Orchestre 5 runs de `recipe-developer` en parallèle. Tient compte :
- Des favoris existants (réutiliser si dispos)
- De la déduplication historique (pas la même recette 2 semaines de suite)
- Des profils multi-personnes

## Profils utilisateur

Le format d'input supporte des profils individuels distincts :

```yaml
profiles:
  person_1:
    name: string
    preferences: string[]
    dietary_constraints: string[]
    sensory_profile:
      spice_tolerance: none | low | medium | high
      texture_aversions: string[]
      sauce_preference: dry | light | heavy
  person_2: { ... }
  pet:
    name: string
    species: dog | cat
    restrictions: string[]

week_constraints:
  max_prep_time_minutes: number
  servings: number
  avoid_repeat_from_history: boolean
```

## Design system

**Références :** Mealime (chaleur organique, fond ivoire, typo douce) + Chefs Plate (cards structurées, densité d'info, badges)

**Ton :** Chaleureux, rassurant, pas technologique — on oublie que c'est de l'IA.

**Palette :**
- Fond : ivoire/crème (`#FAF7F2`)
- Accent principal : terra cotta/orange doux
- Accent secondaire : vert sauge
- Texte : brun foncé (pas noir pur)

**Typographie :**
- Titres : serif expressif (Playfair Display ou similaire)
- Corps : sans-serif lisible (Inter ou Geist)

**Composants caractéristiques :**
- Cards recettes : photo ou illustration, badge temps, badge tags alimentaires
- Onboarding : une question à la fois (pas de formulaire massif)
- État de génération : squelettes animés qui se remplissent progressivement (1/5, 2/5...)
- Liste épicerie : groupée par rayon, cases à cocher, export texte

**ND-friendly obligatoire :**
- Pas de formulaire massif d'un coup
- Feedback visuel clair à chaque étape
- Hiérarchie visuelle forte (pas de mur de texte)
- États de chargement explicites (SSE visible)

## Intégration Studio / SSE

```typescript
// Déclencher une génération
const run = await fetch(`${STUDIO_API_URL}/api/runs`, {
  method: 'POST',
  body: JSON.stringify({ pipeline: 'meal-planner-weekly', input: userProfile }),
})

// Écouter en temps réel
const eventSource = new EventSource(`${STUDIO_API_URL}/api/runs/${runId}/stream`)
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // Mettre à jour les cards au fur et à mesure
}
```

## Variables d'environnement

```env
STUDIO_API_URL=http://localhost:3001   # URL de @studio/api
DATABASE_URL=...                        # Prisma (à venir)
```

## Commandes

```bash
pnpm dev        # Dev local (port 3000)
pnpm build      # Build production
pnpm start      # Start production
```

## Linear Issues — Règle obligatoire

**Tout ticket Linear = toujours un worktree. C'est la première étape, avant tout.**

```bash
git worktree add .worktrees/<branch-name> -b <type>/<stu-xxx-description>
```

`.worktrees/` est dans `.gitignore`.

## Git Workflow — Règles obligatoires

**Tu ne push JAMAIS sur `main`. Jamais. Aucune exception.**

```bash
# 1. Branche (depuis worktree)
git checkout -b feat/stu-xxx-description

# 2. Commits atomiques
git commit -m "feat(generate): add SSE live recipe cards"

# 3. Build
pnpm build

# 4. Push + PR
git push -u origin <branch-name>
gh pr create --title "<titre>" --body "<description>" --base main
```

### Conventions de commit

```
feat(route):     nouvelle fonctionnalité sur une route
fix(component):  bug fix sur un composant
style(ui):       changement visuel, design system
config(studio):  modification d'un fichier .studio/
chore:           maintenance, dépendances
```

### Interdit

- `git push origin main` — NON
- Commit directement sur main — NON
- `git push --force` — NON
- PR sans `pnpm build` — NON

# Memory — Little Chef

## Projet
Meal planner hebdomadaire ND-friendly propulsé par Studio. Next.js 16 / React 19 / TypeScript / Tailwind v4 / pnpm.

## Linear
- Projet : `ad3364b1-cc28-44c4-bc2f-28dda7fd3066` (Little Chef)
- Team : StudioAG (STU)

## Architecture
- Frontend Next.js consomme `@studio/api` via HTTP
- Pipelines : `recipe-developer` + `meal-planner-weekly` dans `.studio/`
- SSE pour génération live

## Routes
`/onboarding`, `/generate`, `/recipes`, `/grocery-list`, `/history`

## Design
Chaleureux, ND-friendly. Refs : Mealime + Chefs Plate. Fond ivoire, terra cotta, vert sauge, serif pour titres.

## Règles git
- Jamais push sur main
- Worktree pour chaque ticket Linear

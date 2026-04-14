# Little Chef

**Powered by [Studio](https://github.com/studio-foundation/studio)** -- agentic pipeline orchestrator with structural validation.

Little Chef is an AI-powered meal planning and recipe development app. It uses Studio pipelines to research cuisines, develop detailed recipes with nutritional profiles, validate cooking techniques, and generate consolidated grocery lists -- all through a Next.js web interface with auth and database persistence.

---

## How it works

Little Chef ships two Studio pipelines:

### `recipe-developer`

Develops a single recipe end-to-end through 5 stages:

1. **culinary-research** -- Researches cuisine, techniques, and flavor profiles for the recipe brief
2. **ingredient-sourcing** -- Identifies ingredients with substitutions and sourcing tips
3. **nutritional-profile** -- Analyzes macros and dietary considerations
4. **recipe-refinement** (group, up to 3 iterations) -- A recipe writer drafts the recipe, then a culinary critic validates techniques. If the critic rejects, the group retries with accumulated feedback
5. **grocery-list** -- Generates a shopping list from the finalized recipe

### `meal-planner-weekly`

Plans a full week of meals:

1. **meal-selection** -- Picks diverse meal briefs based on preferences and constraints
2. **recipe-generation** (parallel group) -- Spawns up to 5 `recipe-developer` sub-pipelines in parallel
3. **consolidate-grocery-list** -- Merges all individual grocery lists into one combined shopping list

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL (or use the included `docker-compose.yml`)
- [Studio CLI](https://github.com/studio-foundation/studio) installed from source

### Setup

```bash
git clone https://github.com/studio-foundation/little-chef-by-studio.git
cd little-chef-by-studio
pnpm install
cp .env.example .env
# Fill in your API keys and database URL in .env
studio config set provider anthropic --api-key $ANTHROPIC_API_KEY
npx prisma migrate dev
```

### Run

```bash
pnpm dev          # Start the Next.js app

# Or run pipelines directly from the CLI:
studio run recipe-developer --input "A classic French onion soup"
studio run meal-planner-weekly --input "5 meals, vegetarian, budget-friendly"
```

## Project structure

```
little-chef-by-studio/
├── .studio/                  # Studio configs (pipelines, agents, contracts)
│   ├── pipelines/            # recipe-developer, meal-planner-weekly
│   ├── agents/               # 9 specialized agents (researcher, writer, critic, etc.)
│   └── contracts/            # Output validation schemas per stage
├── app/                      # Next.js app (App Router)
│   ├── (app)/                # Pages: generate, grocery-list, history
│   └── api/                  # API routes: recipes, runs, grocery-list, profile
├── src/                      # Shared components, lib, types
├── prisma/                   # Database schema and migrations
└── scripts/                  # Utility scripts
```

## License

MIT -- see [LICENSE](./LICENSE)

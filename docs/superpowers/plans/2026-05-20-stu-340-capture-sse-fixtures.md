# STU-340 — Capture SSE Fixtures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture 10 real `recipe-developer` Studio runs as static JSON fixtures for frontend SSE replay.

**Architecture:** `lib/examples.ts` defines the 10 typed inputs. `scripts/capture-fixture.ts` runs each input through Studio sequentially, reads the generated JSONL, normalises timestamps to relative offsets, and writes `fixtures/runs/<slug>.json`. `fixtures/README.md` documents how to recapture.

**Tech Stack:** TypeScript, `tsx` (runtime), `child_process.spawn`, Studio CLI (`studio run`)

---

## File Map

| Path | Action | Responsibility |
|------|--------|----------------|
| `lib/examples.ts` | Create | 10 typed recipe inputs |
| `scripts/capture-fixture.ts` | Create | Orchestrates capture: run → parse JSONL → normalise → write fixture |
| `fixtures/runs/*.json` | Create (10 files) | One fixture per recipe |
| `fixtures/README.md` | Create | How to recapture a fixture |

---

## Task 1: Create `lib/examples.ts` with the 10 inputs

**Files:**
- Create: `lib/examples.ts`

- [ ] **Step 1: Create the file**

```typescript
export interface RecipeExample {
  id: string
  slug: string
  label: string
  input: {
    dish_name: string
    constraints: string[]
  }
}

export const EXAMPLES: RecipeExample[] = [
  {
    id: '01',
    slug: 'pad-thai-vegan',
    label: 'Pad Thai vegan',
    input: {
      dish_name: 'Pad Thai vegan',
      constraints: ['sans produits animaux', 'temps de préparation max 30 minutes', 'pour 4 personnes'],
    },
  },
  {
    id: '02',
    slug: 'risotto-champignons',
    label: 'Risotto aux champignons',
    input: {
      dish_name: 'Risotto aux champignons sauvages',
      constraints: ['végétarien', 'pour 4 personnes', 'ingrédients accessibles en épicerie standard'],
    },
  },
  {
    id: '03',
    slug: 'tacos-tofu-coreens',
    label: 'Tacos tofu coréens',
    input: {
      dish_name: 'Tacos au tofu coréens',
      constraints: ['sans produits animaux', 'pour 6 personnes', 'épicé niveau moyen'],
    },
  },
  {
    id: '04',
    slug: 'soupe-miso-hivernale',
    label: 'Soupe miso hivernale',
    input: {
      dish_name: 'Soupe miso enrichie pour l\'hiver',
      constraints: ['sans gluten', 'pour 2 personnes', 'réconfortant', 'peu d\'ingrédients'],
    },
  },
  {
    id: '05',
    slug: 'curry-vert-thai-poulet',
    label: 'Curry vert thaï poulet',
    input: {
      dish_name: 'Curry vert thaï au poulet',
      constraints: ['temps de préparation max 30 minutes', 'pour 4 personnes', 'niveau intermédiaire'],
    },
  },
  {
    id: '06',
    slug: 'lasagne-vegetarienne',
    label: 'Lasagne végétarienne',
    input: {
      dish_name: 'Lasagne végétarienne maison',
      constraints: ['végétarien', 'pour 6 personnes', 'peut se préparer à l\'avance'],
    },
  },
  {
    id: '07',
    slug: 'bibimbap-sans-gluten',
    label: 'Bibimbap sans gluten',
    input: {
      dish_name: 'Bibimbap',
      constraints: ['sans gluten', 'pour 2 personnes', 'budget raisonnable'],
    },
  },
  {
    id: '08',
    slug: 'salade-nicoise',
    label: 'Salade niçoise',
    input: {
      dish_name: 'Salade niçoise classique',
      constraints: ['sans cuisson', 'pour 4 personnes', 'recette classique fidèle'],
    },
  },
  {
    id: '09',
    slug: 'dahl-lentilles-corail',
    label: 'Dahl de lentilles corail',
    input: {
      dish_name: 'Dahl de lentilles corail',
      constraints: ['sans produits animaux', 'sans gluten', 'temps de préparation max 30 minutes', 'pour 4 personnes'],
    },
  },
  {
    id: '10',
    slug: 'boeuf-bourguignon',
    label: 'Boeuf bourguignon',
    input: {
      dish_name: 'Boeuf bourguignon traditionnel',
      constraints: ['pour 6 personnes', 'recette traditionnelle', 'mijotage long accepté'],
    },
  },
]
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsx --noEmit lib/examples.ts 2>&1 || echo "OK (tsx does not emit)"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/examples.ts
git commit -m "feat(fixtures): add 10 recipe examples for fixture capture (STU-339)"
```

---

## Task 2: Create `scripts/capture-fixture.ts`

**Files:**
- Create: `scripts/capture-fixture.ts`

- [ ] **Step 1: Create the script**

```typescript
import { spawn } from 'child_process'
import { writeFileSync, mkdirSync, readdirSync, statSync, readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { tmpdir } from 'os'
import { writeFileSync as writeTmp } from 'fs'
import { EXAMPLES, type RecipeExample } from '../lib/examples'

const PROJECT_ROOT = resolve(import.meta.dirname, '..')
const STUDIO_RUNS_DIR = join(PROJECT_ROOT, '.studio', 'runs')
const FIXTURES_DIR = join(PROJECT_ROOT, 'fixtures', 'runs')
const MAX_EVENT_BYTES = 10_000

interface RawEvent {
  ts: string
  run_id: string
  event: string
  [key: string]: unknown
}

interface FixtureEvent {
  offset_ms: number
  event: string
  truncated?: true
  [key: string]: unknown
}

interface Fixture {
  id: string
  slug: string
  input: RecipeExample['input']
  captured_at: string
  duration_ms: number
  events: FixtureEvent[]
}

function parseArgs(): { only: number[] } {
  const onlyFlag = process.argv.find((a) => a.startsWith('--only='))
  if (!onlyFlag) return { only: [] }
  return {
    only: onlyFlag
      .replace('--only=', '')
      .split(',')
      .map((n) => parseInt(n.trim(), 10)),
  }
}

function writeInputYaml(example: RecipeExample): string {
  const tmpPath = join(tmpdir(), `studio-input-${example.slug}.yaml`)
  const yaml = [
    `dish_name: "${example.input.dish_name}"`,
    `constraints:`,
    ...example.input.constraints.map((c) => `  - ${c}`),
  ].join('\n')
  writeTmp(tmpPath, yaml)
  return tmpPath
}

function getLatestRunFile(beforeMs: number): string | null {
  if (!existsSync(STUDIO_RUNS_DIR)) return null
  const files = readdirSync(STUDIO_RUNS_DIR)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => ({ name: f, mtime: statSync(join(STUDIO_RUNS_DIR, f)).mtimeMs }))
    .filter((f) => f.mtime >= beforeMs)
    .sort((a, b) => b.mtime - a.mtime)
  return files[0] ? join(STUDIO_RUNS_DIR, files[0].name) : null
}

function normaliseEvents(rawLines: string[]): { events: FixtureEvent[]; duration_ms: number } {
  const parsed: RawEvent[] = rawLines
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as RawEvent)

  const startEvent = parsed.find((e) => e.event === 'pipeline_start')
  const completeEvent = parsed.find((e) => e.event === 'pipeline_complete')
  const startTs = startEvent ? new Date(startEvent.ts).getTime() : 0
  const duration_ms = completeEvent
    ? new Date(completeEvent.ts).getTime() - startTs
    : 0

  const events: FixtureEvent[] = parsed.map((raw) => {
    const { ts, run_id, ...rest } = raw
    const offset_ms = new Date(ts).getTime() - startTs
    const eventStr = JSON.stringify(rest)
    if (eventStr.length > MAX_EVENT_BYTES) {
      return { offset_ms, event: raw.event, truncated: true as const }
    }
    return { offset_ms, ...rest }
  })

  return { events, duration_ms }
}

async function runStudio(inputYamlPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'studio',
      ['run', 'recipe-developer', '--input-file', inputYamlPath],
      { cwd: PROJECT_ROOT, stdio: 'inherit' }
    )
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`studio exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

async function captureOne(example: RecipeExample): Promise<boolean> {
  console.log(`\n[${example.id}] Starting: ${example.input.dish_name}`)
  const inputYaml = writeInputYaml(example)
  const beforeMs = Date.now()

  try {
    await runStudio(inputYaml)
  } catch (err) {
    console.error(`[${example.id}] Run failed:`, err)
    return false
  }

  const runFile = getLatestRunFile(beforeMs)
  if (!runFile) {
    console.error(`[${example.id}] Could not find JSONL run file`)
    return false
  }

  const rawLines = readFileSync(runFile, 'utf-8').split('\n')
  const { events, duration_ms } = normaliseEvents(rawLines)

  const fixture: Fixture = {
    id: example.id,
    slug: example.slug,
    input: example.input,
    captured_at: new Date().toISOString(),
    duration_ms,
    events,
  }

  const outPath = join(FIXTURES_DIR, `${example.id}-${example.slug}.json`)
  const json = JSON.stringify(fixture, null, 2)
  const sizeKb = Math.round(Buffer.byteLength(json) / 1024)

  if (sizeKb > 100) {
    console.warn(`[${example.id}] Warning: fixture is ${sizeKb}KB (> 100KB limit)`)
  }

  writeFileSync(outPath, json)
  console.log(`[${example.id}] Saved ${outPath} (${sizeKb}KB, ${events.length} events, ${duration_ms}ms)`)
  return true
}

async function main() {
  const { only } = parseArgs()
  mkdirSync(FIXTURES_DIR, { recursive: true })

  const targets = only.length > 0
    ? EXAMPLES.filter((e) => only.includes(parseInt(e.id, 10)))
    : EXAMPLES

  if (targets.length === 0) {
    console.error('No matching examples found for --only filter')
    process.exit(1)
  }

  const results: { slug: string; ok: boolean }[] = []
  for (const example of targets) {
    const ok = await captureOne(example)
    results.push({ slug: example.slug, ok })
  }

  console.log('\n=== Summary ===')
  for (const r of results) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.slug}`)
  }
  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    console.error(`\n${failed.length} run(s) failed`)
    process.exit(1)
  }
}

main()
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsx --noEmit scripts/capture-fixture.ts 2>&1 | head -20`

Note: this will error on missing fixtures dir or similar — that's expected. We're only checking for TypeScript errors (type errors show before runtime errors).

Expected: No TypeScript type errors (runtime errors about missing files are OK at this stage).

- [ ] **Step 3: Commit**

```bash
git add scripts/capture-fixture.ts
git commit -m "feat(fixtures): add capture-fixture script (STU-340)"
```

---

## Task 3: Create `fixtures/README.md`

**Files:**
- Create: `fixtures/README.md`

- [ ] **Step 1: Create the file**

```markdown
# Fixtures SSE

Fixtures de runs réels `recipe-developer` capturées pour le replay frontend.

## Structure

Chaque fichier `runs/<id>-<slug>.json` contient :

- `id` — numéro du run (01–10)
- `slug` — identifiant lisible
- `input` — l'input envoyé au pipeline
- `captured_at` — date de capture (ISO 8601)
- `duration_ms` — durée totale du run
- `events` — séquence d'events SSE avec timestamps relatifs (`offset_ms`)

### Types d'events

| event | Description |
|-------|-------------|
| `pipeline_start` | Début du run |
| `stage_start` | Début d'un stage |
| `stage_context` | Contexte injecté dans le stage |
| `stage_complete` | Fin d'un stage (avec status et durée) |
| `pipeline_complete` | Fin du run |

## Recapturer une fixture

Prérequis : clés API dans `.studio/config.yaml` (Anthropic + Tavily).

```bash
# Recapturer toutes les fixtures
npx tsx scripts/capture-fixture.ts

# Recapturer uniquement la fixture #3
npx tsx scripts/capture-fixture.ts --only=3

# Recapturer plusieurs fixtures
npx tsx scripts/capture-fixture.ts --only=1,5,9
```

Coût estimé : ~0.50–1 $ par run (modèle Anthropic + recherche Tavily).

## Format complet d'une fixture

```json
{
  "id": "01",
  "slug": "pad-thai-vegan",
  "input": {
    "dish_name": "Pad Thai vegan",
    "constraints": ["sans produits animaux", "temps de préparation max 30 minutes", "pour 4 personnes"]
  },
  "captured_at": "2026-05-20T14:30:00.000Z",
  "duration_ms": 45231,
  "events": [
    { "offset_ms": 0, "event": "pipeline_start", "pipeline_name": "recipe-developer" },
    { "offset_ms": 120, "event": "stage_start", "stage_name": "culinary-research", "stage_index": 0, "total_stages": 7, "max_attempts": 3 },
    { "offset_ms": 8400, "event": "stage_complete", "stage_name": "culinary-research", "status": "success", "duration_ms": 8280 }
  ]
}
```
```

- [ ] **Step 2: Commit**

```bash
git add fixtures/README.md
git commit -m "docs(fixtures): add fixtures README with recapture instructions"
```

---

## Task 4: Run the 10 captures

- [ ] **Step 1: Check Studio is running and keys are configured**

```bash
cat .studio/config.yaml | grep -E "anthropic|tavily|TAVILY"
studio run recipe-developer --provider mock --input "test" 2>&1 | head -5
```

Expected: config shows API keys, mock run starts without error.

- [ ] **Step 2: Run the capture script (all 10)**

```bash
npx tsx scripts/capture-fixture.ts
```

Expected: 10 JSON files created in `fixtures/runs/`. Each run takes ~2–5 min. Total ~20–50 min. Cost ~5–10$.

- [ ] **Step 3: Verify output files exist and are under 100KB**

```bash
ls -lh fixtures/runs/
du -sh fixtures/runs/*.json | sort -h
```

Expected: 10 files, each under 100KB.

- [ ] **Step 4: Spot-check one fixture**

```bash
cat fixtures/runs/01-pad-thai-vegan.json | npx tsx -e "
const fs = require('fs');
const f = JSON.parse(fs.readFileSync('fixtures/runs/01-pad-thai-vegan.json', 'utf-8'));
console.log('events:', f.events.length);
console.log('duration_ms:', f.duration_ms);
console.log('first event:', f.events[0]);
console.log('last event:', f.events[f.events.length - 1]);
"
```

Expected: events count > 5, first event is `pipeline_start` with `offset_ms: 0`, last event is `pipeline_complete`.

- [ ] **Step 5: Commit fixtures**

```bash
git add fixtures/runs/
git commit -m "feat(fixtures): capture 10 real recipe-developer runs (STU-340)"
```

---

## Task 5: Final verification

- [ ] **Step 1: Verify build still passes**

```bash
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Confirm fixture count**

```bash
ls fixtures/runs/*.json | wc -l
```

Expected: `10`

- [ ] **Step 3: Confirm all fixtures have pipeline_complete**

```bash
for f in fixtures/runs/*.json; do
  has_complete=$(node -e "const d=JSON.parse(require('fs').readFileSync('$f')); console.log(d.events.some(e=>e.event==='pipeline_complete') ? 'ok' : 'MISSING')")
  echo "$f: $has_complete"
done
```

Expected: all `ok`

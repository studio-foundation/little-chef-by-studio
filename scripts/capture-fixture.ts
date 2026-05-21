import { spawn } from 'child_process'
import { writeFileSync, mkdirSync, readdirSync, statSync, readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { tmpdir } from 'os'
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
  writeFileSync(tmpPath, yaml)
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

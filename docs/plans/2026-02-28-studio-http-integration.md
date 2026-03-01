# Studio HTTP Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connecter la page `/generate` à l'API Studio via HTTP — remplacer les mock data par de vrais pipeline runs SSE.

**Architecture:** 5 runs `recipe-developer` parallèles déclenchés via `POST /api/generate` (Next.js route handler), chacun suivi via `EventSource` directement sur Studio API (CORS: origin=true). Les events SSE (`stage_start`, `stage_complete`, `pipeline_complete`) pilotent l'état des 5 slots de cards.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, SSE (EventSource), Studio API (Fastify, port 3001), `fetch` natif.

---

## Pré-requis

Studio API doit tourner pendant le dev :
```bash
cd /home/arianeguay/dev/src/little-chef-by-studio
studio api start   # port 3001
```

Vérifier que les pipelines, agents et contracts sont bien dans `.studio/`.

---

## Task 1 : Worktree + branche

**Fichiers :** aucun (setup git)

**Step 1 : Créer le worktree**

```bash
cd /home/arianeguay/dev/src/little-chef-by-studio
git worktree add .worktrees/studio-http -b feat/studio-http-integration
cd .worktrees/studio-http
```

**Step 2 : Vérifier**

```bash
git branch   # doit afficher feat/studio-http-integration
pwd          # doit finir par .worktrees/studio-http
```

---

## Task 2 : Variables d'environnement

**Fichiers :**
- Create : `.env.local` (gitignored — ne pas committer)

**Step 1 : Créer `.env.local`**

```bash
cat > .env.local << 'EOF'
STUDIO_API_URL=http://localhost:3001
NEXT_PUBLIC_STUDIO_API_URL=http://localhost:3001
EOF
```

**Step 2 : Vérifier que `.env.local` est dans `.gitignore`**

```bash
grep ".env.local" .gitignore || echo ".env.local" >> .gitignore
```

---

## Task 3 : Studio client module

**Fichiers :**
- Create : `src/lib/studio/client.ts`

Ce module est le seul point de contact avec Studio API côté serveur. Pas d'import de packages `@studio/*`.

**Step 1 : Créer `src/lib/studio/client.ts`**

```typescript
const STUDIO_URL = process.env.STUDIO_API_URL ?? 'http://localhost:3001';

export interface RunCreated {
  run_id: string;
  status: string;
  stream_url: string;
}

export interface RecipeInput {
  dish_name: string;
  constraints: string[];
}

export async function startRun(input: RecipeInput): Promise<RunCreated> {
  const res = await fetch(`${STUDIO_URL}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pipeline: 'recipe-developer', input }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Studio API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<RunCreated>;
}
```

**Step 2 : Commit**

```bash
git add src/lib/studio/client.ts
git commit -m "feat(studio): add Studio API client module"
```

---

## Task 4 : SSE event types locaux

**Fichiers :**
- Create : `src/lib/studio/events.ts`

Types copiés depuis `@studio/api/src/event-bus.ts` — pas d'import du package Studio.

**Step 1 : Créer `src/lib/studio/events.ts`**

```typescript
// Types d'événements SSE émis par Studio API
// Source : @studio/api/src/event-bus.ts (copie locale, pas d'import)

export type SseEventType =
  | 'pipeline_start'
  | 'stage_start'
  | 'stage_complete'
  | 'stage_retry'
  | 'group_start'
  | 'group_iteration'
  | 'group_feedback'
  | 'group_complete'
  | 'pipeline_complete'
  | 'pipeline_cancelled'
  | 'done';

export interface StageStartData {
  stage_name: string;
  stage_index: number;
  total_stages: number;
  max_attempts: number;
}

export interface StageCompleteData {
  stage_name: string;
  stage_index: number;
  total_stages: number;
  status: string; // 'success' | 'failed' | 'rejected'
  attempts: number;
  duration_ms: number;
  output_summary?: string;
  output?: unknown;
}

export interface PipelineCompleteData {
  pipeline_name: string;
  run_id: string;
  status: string; // 'success' | 'failed' | 'cancelled'
  duration_ms: number;
  total_tokens: number;
}
```

**Step 2 : Commit**

```bash
git add src/lib/studio/events.ts
git commit -m "feat(studio): add local SSE event type definitions"
```

---

## Task 5 : Route handler POST /api/generate

**Fichiers :**
- Create : `app/api/generate/route.ts`

Lance 5 runs parallèles, retourne leurs IDs au client.

**Step 1 : Créer `app/api/generate/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { startRun, type RecipeInput } from '@/src/lib/studio/client';

// 5 recettes MVP — remplacées par le profil utilisateur plus tard
const RECIPE_REQUESTS: RecipeInput[] = [
  { dish_name: 'Ramen tonkotsu végétalien', constraints: ['sans produits animaux', '90 min max', '4 personnes'] },
  { dish_name: 'Buddha bowl quinoa', constraints: ['sans gluten', '30 min max', '2 personnes'] },
  { dish_name: 'Curry de pois chiches', constraints: ['végétalien', '45 min max', '4 personnes'] },
  { dish_name: 'Pâtes primavera', constraints: ['végétarien', '30 min max', '2 personnes'] },
  { dish_name: 'Soupe miso aux légumes', constraints: ['sans gluten', '20 min max', '2 personnes'] },
];

export async function POST() {
  try {
    const runs = await Promise.all(RECIPE_REQUESTS.map(startRun));
    return NextResponse.json({ runs });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Studio API unreachable';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

**Step 2 : Tester manuellement (Studio API doit tourner)**

```bash
# Dans un terminal : studio api start
# Dans un autre terminal :
curl -X POST http://localhost:3000/api/generate
# Attendu : { "runs": [{ "run_id": "...", "status": "running", "stream_url": "..." }, ...] }
```

**Step 3 : Commit**

```bash
git add app/api/generate/route.ts
git commit -m "feat(api): add /api/generate route — launches 5 parallel Studio runs"
```

---

## Task 6 : Refactorer la page /generate

**Fichiers :**
- Modify : `app/(app)/generate/page.tsx`

Remplace `setInterval` + mock data par appel à `/api/generate` + 5 EventSource.

**Step 1 : Comprendre l'état actuel**

Lire `app/(app)/generate/page.tsx`. L'état actuel :
- `state: 'idle' | 'generating' | 'success'`
- `revealed: number` (0–5, piloté par setInterval)
- `SAMPLE_RECIPES` indexées par `i < revealed`

**Step 2 : Remplacer le state par 5 slots**

Remplacer tout le contenu de `app/(app)/generate/page.tsx` par :

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { ProgressBar } from "@/src/components/generate/ProgressBar";
import { RecipeCard } from "@/src/components/generate/RecipeCard";
import { SkeletonCard } from "@/src/components/generate/SkeletonCard";
import { SAMPLE_RECIPES } from "@/src/components/generate/sampleData";
import PageLayout from "@/src/components/ui/PageLayout";
import { Button } from "@/src/components/ui";
import { useRouter } from "next/navigation";
import type { StageCompleteData, PipelineCompleteData } from "@/src/lib/studio/events";

const STUDIO_URL = process.env.NEXT_PUBLIC_STUDIO_API_URL ?? 'http://localhost:3001';
const TOTAL = 5;

type SlotStatus = 'idle' | 'running' | 'done' | 'error';

interface Slot {
  status: SlotStatus;
  runId?: string;
  currentStage?: string;
  stageIndex?: number;
  totalStages?: number;
  summary?: string;
}

type PageState = 'idle' | 'generating' | 'success';

export default function GeneratePage() {
  const [pageState, setPageState] = useState<PageState>('idle');
  const [slots, setSlots] = useState<Slot[]>(Array(TOTAL).fill({ status: 'idle' }));
  const sourcesRef = useRef<EventSource[]>([]);
  const router = useRouter();

  const updateSlot = (index: number, patch: Partial<Slot>) =>
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));

  const startGeneration = async () => {
    setPageState('generating');
    setSlots(Array(TOTAL).fill({ status: 'idle' }));

    let runs: Array<{ run_id: string; stream_url: string }>;
    try {
      const res = await fetch('/api/generate', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as { runs: Array<{ run_id: string; stream_url: string }> };
      runs = body.runs;
    } catch {
      setPageState('idle');
      return;
    }

    // Initialiser les slots avec les run_ids
    setSlots(runs.map(r => ({ status: 'running' as SlotStatus, runId: r.run_id })));

    // Ouvrir 5 EventSource en parallèle
    sourcesRef.current = runs.map((run, index) => {
      const es = new EventSource(`${STUDIO_URL}/api/runs/${run.run_id}/stream`);

      es.addEventListener('stage_start', (e) => {
        const data = JSON.parse(e.data) as StageCompleteData;
        updateSlot(index, {
          currentStage: data.stage_name,
          stageIndex: data.stage_index,
          totalStages: data.total_stages,
        });
      });

      es.addEventListener('stage_complete', (e) => {
        const data = JSON.parse(e.data) as StageCompleteData;
        updateSlot(index, {
          currentStage: data.stage_name,
          stageIndex: data.stage_index,
          totalStages: data.total_stages,
          summary: data.output_summary ?? undefined,
        });
      });

      es.addEventListener('pipeline_complete', (e) => {
        const data = JSON.parse(e.data) as PipelineCompleteData;
        updateSlot(index, {
          status: data.status === 'success' ? 'done' : 'error',
          currentStage: undefined,
        });
      });

      es.addEventListener('done', () => {
        es.close();
      });

      es.onerror = () => {
        updateSlot(index, { status: 'error' });
        es.close();
      };

      return es;
    });
  };

  // Passer à 'success' quand tous les slots sont done/error
  useEffect(() => {
    if (pageState !== 'generating') return;
    const allSettled = slots.every(s => s.status === 'done' || s.status === 'error');
    if (allSettled && slots.some(s => s.status === 'done')) {
      setPageState('success');
    }
  }, [slots, pageState]);

  const cancel = () => {
    sourcesRef.current.forEach(es => es.close());
    sourcesRef.current = [];
    setPageState('idle');
    setSlots(Array(TOTAL).fill({ status: 'idle' }));
  };

  const reset = () => {
    sourcesRef.current.forEach(es => es.close());
    sourcesRef.current = [];
    setPageState('idle');
    setSlots(Array(TOTAL).fill({ status: 'idle' }));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { sourcesRef.current.forEach(es => es.close()); };
  }, []);

  const doneCount = slots.filter(s => s.status === 'done').length;
  const isIdle = pageState === 'idle';
  const isGenerating = pageState === 'generating';
  const isDone = pageState === 'success';

  return (
    <PageLayout
      title={isDone ? "Ta semaine est prête 🎉" : "Ma semaine"}
      description={
        <>
          {isIdle && "5 repas générés selon tes préférences"}
          {isGenerating && `${doneCount}/${TOTAL} recettes prêtes…`}
          {isDone && "Semaine du 3 au 7 mars 2026"}
        </>
      }
      headerAction={
        <div className="flex items-center gap-2.5">
          {isGenerating && (
            <Button variant="outline" size="sm" onClick={cancel}>
              Annuler
            </Button>
          )}
          {(isIdle || isDone) && (
            <Button variant="primary" size="lg" onClick={isDone ? reset : startGeneration}>
              {isDone ? "↺ Regénérer" : "✨ Générer ma semaine"}
            </Button>
          )}
        </div>
      }
    >
      {isGenerating && (
        <div className="mb-6 animate-[fadeSlideUp_0.3s_ease]">
          <ProgressBar current={doneCount} total={TOTAL} />
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {slots.map((slot, i) => {
          if (isIdle || slot.status === 'idle') {
            return (
              <div
                key={i}
                className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-white"
              >
                <span className="text-[28px] opacity-40">🍽</span>
                <span className="text-[13px] text-[var(--color-text-muted)]">
                  Recette {i + 1}
                </span>
              </div>
            );
          }
          if (slot.status === 'running') {
            return (
              <div key={i} className="relative">
                <SkeletonCard />
                {slot.currentStage && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] text-[var(--color-text-muted)] shadow-sm">
                      {slot.currentStage.replace(/-/g, ' ')}
                      {slot.stageIndex != null && slot.totalStages != null
                        ? ` · ${slot.stageIndex + 1}/${slot.totalStages}`
                        : ''}
                    </span>
                  </div>
                )}
              </div>
            );
          }
          if (slot.status === 'done') {
            // Afficher la recipe mock correspondante avec les données disponibles
            // TODO: remplacer par les vraies données de l'output quand le parsing est implémenté
            return (
              <RecipeCard key={i} recipe={SAMPLE_RECIPES[i]} visible />
            );
          }
          if (slot.status === 'error') {
            return (
              <div
                key={i}
                className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-[var(--color-border)] bg-white"
              >
                <span className="text-[28px] opacity-40">⚠️</span>
                <span className="text-[13px] text-[var(--color-text-muted)]">
                  Erreur recette {i + 1}
                </span>
              </div>
            );
          }
          return null;
        })}
      </div>

      {isDone && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-5 animate-[fadeSlideUp_0.5s_ease]">
          <div>
            <p className="mb-1 font-[family-name:var(--font-playfair)] text-base font-semibold text-[var(--color-text)]">
              Prêt·e à cuisiner?
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Génère ta liste d'épicerie ou explore les recettes.
            </p>
          </div>
          <div className="flex gap-2.5">
            <Button variant="ghost" size="sm" onClick={() => router.push("/grocery-list")}>
              📋 Liste d&apos;épicerie
            </Button>
            <Button variant="primary" size="sm" onClick={() => router.push("/recipes")}>
              Voir les recettes →
            </Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
```

**Step 3 : Vérifier TypeScript**

```bash
pnpm build
# Attendu : zéro erreur TypeScript. Les warnings Prisma/DB sur les routes auth sont OK.
```

**Step 4 : Commit**

```bash
git add app/(app)/generate/page.tsx
git commit -m "feat(generate): connect page to Studio API via HTTP + SSE"
```

---

## Task 7 : Test manuel end-to-end

**Step 1 : Démarrer Studio API**

```bash
# Terminal 1 (dans le worktree)
studio api start
# Attendu : Studio API listening on http://localhost:3001
```

**Step 2 : Démarrer Little Chef**

```bash
# Terminal 2 (dans le worktree)
pnpm dev
# Attendu : ✓ Ready on http://localhost:3000
```

**Step 3 : Tester**

1. Ouvrir `http://localhost:3000/generate`
2. Cliquer "✨ Générer ma semaine"
3. Observer :
   - 5 slots passent à SkeletonCard avec stage name visible
   - Progress bar monte (0/5 → 1/5 → ... → 5/5)
   - Cards se révèlent au fur et à mesure (mock recipes pour l'instant)
   - Bouton "Annuler" fonctionne
   - Footer "Prêt·e à cuisiner?" apparaît quand tout est done

**Step 4 : Vérifier la console navigateur**

Aucune erreur CORS (Studio API a `origin: true`).
Les EventSource events arrivent bien.

---

## Task 8 : Build final + PR

**Step 1 : Build de prod**

```bash
pnpm build
# Attendu : Build réussi, 0 erreur TypeScript
```

**Step 2 : Push + PR**

```bash
git push -u origin feat/studio-http-integration
gh pr create \
  --title "feat(generate): connect to Studio API via HTTP + SSE" \
  --body "Connecte /generate à Studio API. 5 runs recipe-developer en parallèle, SSE temps réel. Remplace mock setInterval. Voir docs/plans/2026-02-28-studio-http-integration-design.md" \
  --base main
```

---

## Notes importantes

**Concernant STU-205 (PgRunStore) :** Ce ticket est dépriorisé. L'architecture HTTP avec `studio api start` (SQLite) suffit pour le MVP. PgRunStore sera implémenté quand la production requiert une vraie DB partagée.

**RecipeCard avec mock data :** Quand `pipeline_complete` fire, la page affiche encore `SAMPLE_RECIPES[i]` (les mock données). C'est intentionnel pour le MVP — le parsing de l'output Markdown Studio vers le format `Recipe` est une tâche séparée.

**Annulation :** `POST /api/runs/:id/cancel` est disponible dans Studio API mais non implémentée côté Little Chef pour l'instant — le bouton "Annuler" ferme juste les EventSource locaux.

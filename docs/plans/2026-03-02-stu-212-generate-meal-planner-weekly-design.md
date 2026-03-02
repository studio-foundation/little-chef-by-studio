# Design — STU-212 : Câbler /generate sur meal-planner-weekly

**Date :** 2026-03-02
**Ticket :** [STU-212](https://linear.app/studioag/issue/STU-212)
**Statut :** Approuvé

---

## Problème

Le bouton "Générer ma semaine" (`/generate`) appelle `POST /api/generate` qui lance **5 runs** `recipe-developer` séparés depuis le backend Next.js, bypassant entièrement le pipeline `meal-planner-weekly`.

```
Actuel : Button → POST /api/generate → 5× POST /api/runs (recipe-developer) → SSE ×5
Cible  : Button → POST /api/runs     → 1× POST /api/runs (meal-planner-weekly) → 1 stream → 5 cards
```

---

## Solution retenue

**Approche A — Nouveau proxy route `app/api/runs/route.ts`**

Crée un proxy POST dans Next.js (symétrique au proxy SSE existant `app/api/runs/[id]/stream/route.ts`), avec auth check. Le frontend appelle ce proxy qui forward vers Studio. Supprime `app/api/generate/route.ts`.

---

## Architecture

```
Button "Générer ma semaine"
  → POST /api/runs (Next.js proxy, auth check)
    → POST ${STUDIO_API_URL}/api/runs { pipeline: 'meal-planner-weekly', input: userProfile }
    → { run_id }
  → open EventSource /api/runs/{run_id}/stream
    → stage_start  { stage_name: 'recipe-1' } → slot[0].status = 'running'
    → stage_start  { stage_name: 'recipe-2' } → slot[1].status = 'running'
    ...
    → stage_complete { stage_name: 'recipe-1', status: 'success' } → slot[0].status = 'done'
    ...
    → pipeline_complete → pageState = 'success'
    → done → es.close()
```

---

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `app/api/generate/route.ts` | **SUPPRIMÉ** |
| `app/api/runs/route.ts` | **CRÉÉ** — proxy POST avec auth check |
| `src/lib/studio/client.ts` | **MIS À JOUR** — remplace `RecipeInput`/`startRun` par `WeeklyPlanInput`/`startWeeklyPlan` |
| `app/(app)/generate/page.tsx` | **MIS À JOUR** — 1 EventSource, mapping `recipe-N` → slot |

---

## Détails d'implémentation

### `app/api/runs/route.ts` (nouveau)

Thin proxy POST. Auth check → forward vers Studio API.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const STUDIO_URL = process.env.NEXT_PUBLIC_API_URL;
  if (!STUDIO_URL) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_API_URL is not set' }, { status: 500 });
  }

  const body = await req.json();
  const res = await fetch(`${STUDIO_URL}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

---

### `src/lib/studio/client.ts` (mis à jour)

Remplace les types/fonctions liés à `recipe-developer` par `meal-planner-weekly`.

```typescript
export interface WeeklyPlanInput {
  profiles: Record<string, unknown>;
  week_constraints: {
    max_prep_time_minutes: number;
    servings: number;
    avoid_repeat_from_history: boolean;
    meal_count: number;
  };
  userId: string;
}

const PLACEHOLDER_PROFILE: Omit<WeeklyPlanInput, 'userId'> = {
  profiles: {
    person_1: {
      name: 'Alex',
      preferences: ['cuisine méditerranéenne', 'cuisine asiatique'],
      dietary_constraints: ['végétarien'],
      sensory_profile: {
        spice_tolerance: 'medium',
        texture_aversions: [],
        sauce_preference: 'light',
      },
    },
  },
  week_constraints: {
    max_prep_time_minutes: 45,
    servings: 2,
    avoid_repeat_from_history: true,
    meal_count: 5,
  },
};

export async function startWeeklyPlan(userId: string): Promise<RunCreated> {
  const res = await fetch('/api/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pipeline: 'meal-planner-weekly',
      input: { ...PLACEHOLDER_PROFILE, userId },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Studio API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<RunCreated>;
}
```

---

### `app/(app)/generate/page.tsx` (mis à jour)

**1 EventSource** au lieu de 5. Mapping `stage_name: 'recipe-N'` → `slot[N-1]`.

```typescript
// Slot state change
sourcesRef.current: EventSource | null  // au lieu de EventSource[]

const startGeneration = async () => {
  setPageState('generating');
  setSlots(Array.from({ length: TOTAL }, () => ({ status: 'idle' as SlotStatus })));

  let run: { run_id: string };
  try {
    const res = await fetch('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pipeline: 'meal-planner-weekly',
        input: { ...PLACEHOLDER_PROFILE, userId: session.user.id },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    run = await res.json();
  } catch {
    setPageState('idle');
    return;
  }

  const es = new EventSource(`/api/runs/${run.run_id}/stream`);
  sourcesRef.current = es;

  es.addEventListener('stage_start', (e) => {
    const data = JSON.parse((e as MessageEvent).data) as StageStartData;
    const match = data.stage_name.match(/^recipe-(\d+)$/);
    if (!match) return;
    const idx = parseInt(match[1], 10) - 1;
    updateSlot(idx, { status: 'running', currentStage: 'Génération en cours...' });
  });

  es.addEventListener('stage_complete', (e) => {
    const data = JSON.parse((e as MessageEvent).data) as StageCompleteData;
    const match = data.stage_name.match(/^recipe-(\d+)$/);
    if (!match) return;
    const idx = parseInt(match[1], 10) - 1;
    updateSlot(idx, {
      status: data.status === 'success' ? 'done' : 'error',
      currentStage: undefined,
    });
  });

  es.addEventListener('pipeline_complete', (e) => {
    const data = JSON.parse((e as MessageEvent).data) as PipelineCompleteData;
    if (data.status !== 'success') {
      setSlots(prev => prev.map(s =>
        s.status === 'running' ? { ...s, status: 'error' } : s
      ));
    }
  });

  es.addEventListener('done', () => es.close());
  es.onerror = () => {
    setSlots(prev => prev.map(s =>
      s.status === 'running' ? { ...s, status: 'error' } : s
    ));
    es.close();
  };
};
```

**Cancel :**
```typescript
const cancel = () => {
  sourcesRef.current?.close();
  sourcesRef.current = null;
  // ...
};
```

---

## UX : impact visible

Les slots ne montrent plus les sous-stages internes de `recipe-developer` (culinary-research, ingredient-sourcing...) car le stream parent ne les expose pas. Un slot passe directement de `idle` → `running` (avec "Génération en cours...") → `done`.

Le champ `currentStage` dans `Slot` reste dans l'interface pour ne pas casser le rendu, mais ne contiendra plus de noms de stages granulaires.

---

## Input utilisateur (placeholder)

Le profil placeholder est défini dans `client.ts`. Il sera remplacé par les vraies données de l'onboarding quand STU-onboarding sera implémenté.

---

## Critères d'acceptation (STU-212)

- [ ] Le bouton déclenche 1 seul `POST /api/runs` avec `pipeline: 'meal-planner-weekly'`
- [ ] L'input contient le profil utilisateur (profiles, week_constraints) — pas un dish_name hardcodé
- [ ] Les 5 cards se remplissent progressivement via les événements SSE du groupe parallèle
- [ ] `app/api/generate/route.ts` supprimé
- [ ] Comportement visible identique à l'actuel (squelettes → cards remplies progressivement)

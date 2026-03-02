# STU-212 — Câbler /generate sur meal-planner-weekly — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer les 5 appels `recipe-developer` indépendants par 1 seul appel `meal-planner-weekly`, écouter le stream SSE unique et mapper les événements `stage_name: 'recipe-N'` sur les 5 cards.

**Architecture:** Nouveau proxy POST `app/api/runs/route.ts` (auth → Studio). `client.ts` passe de `startRun(RecipeInput)` à `startWeeklyPlan(userId)` avec profil placeholder. `page.tsx` passe de 5 EventSources à 1 seul, mapping regex `recipe-N` → slot[N-1]. `app/api/generate/route.ts` supprimé.

**Tech Stack:** Next.js 16 App Router, TypeScript 5, `auth()` de `@/auth`

---

## Prérequis

- STU-211 doit être mergé (le pipeline `meal-planner-weekly` doit exister et émettre les bons événements SSE)
- Worktree isolé selon les règles CLAUDE.md

---

### Task 1 : Worktree

**Files :**
- (worktree dans `.worktrees/stu-212`)

**Step 1 : Créer le worktree**

```bash
cd /home/arianeguay/dev/src/little-chef-by-studio
git worktree add .worktrees/stu-212 -b arianedguay/stu-212-generate-cabler-le-bouton-sur-meal-planner-weekly-au-lieu-de
```

**Step 2 : Vérifier la branche**

```bash
cd .worktrees/stu-212
git branch --show-current
```

Expected : `arianedguay/stu-212-generate-cabler-le-bouton-sur-meal-planner-weekly-au-lieu-de`

---

### Task 2 : Créer `app/api/runs/route.ts`

**Files :**
- Create: `app/api/runs/route.ts`

Ce proxy POST est la paire du proxy SSE déjà existant `app/api/runs/[id]/stream/route.ts`. Il reçoit le body du client, vérifie l'auth, forward vers Studio API.

**Step 1 : Créer le fichier**

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

  const body = await req.json() as Record<string, unknown>;
  const res = await fetch(`${STUDIO_URL}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
```

**Step 2 : Vérifier TypeScript**

```bash
pnpm build
```

Expected : build réussi (pas d'erreur TypeScript sur le nouveau fichier)

**Step 3 : Commit**

```bash
git add app/api/runs/route.ts
git commit -m "feat(api): STU-212 — proxy POST /api/runs vers Studio avec auth

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3 : Mettre à jour `src/lib/studio/client.ts`

**Files :**
- Modify: `src/lib/studio/client.ts`

Remplacer `RecipeInput` / `startRun` (qui appelaient `recipe-developer` avec `dish_name`) par `WeeklyPlanInput` / `startWeeklyPlan` (qui appelle `meal-planner-weekly` avec un profil complet).

**Step 1 : Remplacer le contenu entier du fichier**

```typescript
export interface RunCreated {
  run_id: string;
  status: string;
  stream_url: string;
}

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

// Placeholder : remplacé par les vraies données d'onboarding (STU-onboarding)
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

**Step 2 : Vérifier TypeScript**

```bash
pnpm build
```

Expected : build réussi. Si erreur TypeScript liée à `startRun` encore importé quelque part → corriger l'import dans le prochain step.

**Step 3 : Commit**

```bash
git add src/lib/studio/client.ts
git commit -m "feat(studio): STU-212 — startWeeklyPlan remplace startRun dans client.ts

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4 : Mettre à jour `app/(app)/generate/page.tsx`

**Files :**
- Modify: `app/(app)/generate/page.tsx`

Refondre la logique de génération : 1 seul `EventSource` au lieu de 5, mapping `stage_name: 'recipe-N'` → slot[N-1].

**Step 1 : Mettre à jour les imports**

Remplacer l'import `startRun` par `startWeeklyPlan` :

```typescript
// Supprimer cette ligne :
// import { startRun } from '@/src/lib/studio/client';

// Ajouter :
import { startWeeklyPlan } from '@/src/lib/studio/client';
import { useSession } from 'next-auth/react';
```

Ajouter l'usage de la session en haut du composant :
```typescript
const { data: session } = useSession();
```

> Note : si `useSession` n'est pas disponible ou si le projet utilise un autre mécanisme pour le userId côté client, passer le userId via le proxy (le proxy `/api/runs` connaît déjà l'identité via `auth()`). Dans ce cas, `startWeeklyPlan` n'a pas besoin du userId — il peut passer `userId: ''` et laisser le proxy enrichir si nécessaire. **Approche simplifiée recommandée :** ne pas passer userId depuis le client, le proxy `app/api/runs/route.ts` a déjà accès à `session.user.id`.

**Step 1b : Simplifier `startWeeklyPlan` (pas de userId depuis le client)**

Si `useSession` n'est pas trivial à importer, modifier `client.ts` pour que `startWeeklyPlan` ne prenne pas de `userId` (le proxy gère ça côté serveur) :

```typescript
// Dans client.ts, changer la signature :
export async function startWeeklyPlan(): Promise<RunCreated> {
  const res = await fetch('/api/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pipeline: 'meal-planner-weekly',
      input: PLACEHOLDER_PROFILE,  // pas de userId ici
    }),
  });
  // ...
}
```

Et dans `app/api/runs/route.ts`, injecter le userId depuis la session :

```typescript
// Dans route.ts, avant le forward :
const bodyWithUser = { ...body, input: { ...(body.input as Record<string, unknown>), userId: session.user.id } };
body: JSON.stringify(bodyWithUser),
```

> Choisir l'approche qui compile sans erreur TypeScript. L'objectif est que `userId` arrive dans l'input Studio.

**Step 2 : Changer le type de `sourcesRef`**

```typescript
// Avant :
const sourcesRef = useRef<EventSource[]>([]);

// Après :
const sourcesRef = useRef<EventSource | null>(null);
```

**Step 3 : Réécrire `startGeneration`**

Remplacer la fonction entière :

```typescript
const startGeneration = async () => {
  setPageState('generating');
  setRecipes([]);
  setSlots(Array.from({ length: TOTAL }, () => ({ status: 'idle' as SlotStatus })));

  let runId: string;
  try {
    const run = await startWeeklyPlan();
    runId = run.run_id;
  } catch {
    setPageState('idle');
    return;
  }

  // Ouvrir 1 seul EventSource
  const es = new EventSource(`/api/runs/${runId}/stream`);
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
      // Fermer les slots encore en running si le pipeline a échoué globalement
      setSlots(prev => prev.map(s =>
        s.status === 'running' ? { ...s, status: 'error' as SlotStatus } : s
      ));
    }
  });

  es.addEventListener('done', () => {
    es.close();
  });

  es.onerror = () => {
    setSlots(prev => prev.map(s =>
      s.status === 'running' ? { ...s, status: 'error' as SlotStatus } : s
    ));
    es.close();
  };
};
```

**Step 4 : Mettre à jour `cancel` et `reset`**

```typescript
const cancel = () => {
  sourcesRef.current?.close();
  sourcesRef.current = null;
  setPageState('idle');
  setSlots(Array.from({ length: TOTAL }, () => ({ status: 'idle' as SlotStatus })));
};

const reset = () => {
  sourcesRef.current?.close();
  sourcesRef.current = null;
  setRecipes([]);
  void startGeneration();
};
```

**Step 5 : Mettre à jour le cleanup `useEffect`**

```typescript
// Avant :
useEffect(() => {
  return () => { sourcesRef.current.forEach(es => es.close()); };
}, []);

// Après :
useEffect(() => {
  return () => { sourcesRef.current?.close(); };
}, []);
```

**Step 6 : Vérifier TypeScript**

```bash
pnpm build
```

Expected : build réussi. Corriger toute erreur de type avant de commit.

**Step 7 : Commit**

```bash
git add app/(app)/generate/page.tsx src/lib/studio/client.ts
git commit -m "feat(generate): STU-212 — 1 EventSource meal-planner-weekly, mapping recipe-N → slot

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5 : Supprimer `app/api/generate/route.ts`

**Files :**
- Delete: `app/api/generate/route.ts`

**Step 1 : Supprimer**

```bash
git rm app/api/generate/route.ts
```

**Step 2 : Vérifier qu'il n'est plus référencé nulle part**

```bash
grep -r "api/generate" app/ src/ --include="*.ts" --include="*.tsx"
```

Expected : aucun résultat (ou seulement des commentaires/docs).

**Step 3 : Build final**

```bash
pnpm build
```

Expected : build réussi, pas d'erreur TypeScript.

**Step 4 : Commit**

```bash
git commit -m "feat(generate): STU-212 — supprimer app/api/generate/route.ts (remplacé par /api/runs)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6 : Push + PR

**Step 1 : Push**

```bash
git push -u origin arianedguay/stu-212-generate-cabler-le-bouton-sur-meal-planner-weekly-au-lieu-de
```

**Step 2 : Créer la PR**

```bash
gh pr create \
  --title "feat(generate): STU-212 — câbler meal-planner-weekly au lieu de 5× recipe-developer" \
  --body "$(cat <<'EOF'
## Summary
- Remplace les 5 appels `recipe-developer` par 1 seul appel `meal-planner-weekly`
- Crée `app/api/runs/route.ts` — proxy POST avec auth check (symétrique au proxy SSE existant)
- Met à jour `page.tsx` : 1 EventSource, mapping `stage_name: 'recipe-N'` → slot[N-1]
- Supprime `app/api/generate/route.ts`
- Input : profil placeholder hardcodé (à remplacer par l'onboarding)

## Test plan
- [ ] Bouton déclenche 1 seul `POST /api/runs` avec `pipeline: 'meal-planner-weekly'`
- [ ] L'input contient `profiles` + `week_constraints` (pas `dish_name`)
- [ ] Les 5 cards se remplissent progressivement via SSE (`recipe-1`...`recipe-5`)
- [ ] `app/api/generate/route.ts` supprimé et non référencé
- [ ] `pnpm build` passe sans erreur TypeScript

## Prérequis
- STU-211 mergé (pipeline `meal-planner-weekly` avec parallel group)

Closes STU-212

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main
```

---

## Résumé des fichiers touchés

| Fichier | Action |
|---------|--------|
| `app/api/generate/route.ts` | **SUPPRIMÉ** |
| `app/api/runs/route.ts` | **CRÉÉ** — proxy POST avec auth |
| `src/lib/studio/client.ts` | **MIS À JOUR** — `startWeeklyPlan` remplace `startRun` |
| `app/(app)/generate/page.tsx` | **MIS À JOUR** — 1 EventSource, mapping `recipe-N` |

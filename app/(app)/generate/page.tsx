"use client";

import { useEffect, useRef, useState } from "react";
import { ProgressBar } from "@/src/components/generate/ProgressBar";
import { RecipeCard } from "@/src/components/generate/RecipeCard";
import { SkeletonCard } from "@/src/components/generate/SkeletonCard";
import { SAMPLE_RECIPES } from "@/src/components/generate/sampleData";
import PageLayout from "@/src/components/ui/PageLayout";
import { Button } from "@/src/components/ui";
import { useRouter } from "next/navigation";
import type { StageStartData, StageCompleteData, PipelineCompleteData } from "@/src/lib/studio/events";

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
  const [slots, setSlots] = useState<Slot[]>(Array.from({ length: TOTAL }, () => ({ status: 'idle' as SlotStatus })));
  const sourcesRef = useRef<EventSource[]>([]);
  const router = useRouter();

  const updateSlot = (index: number, patch: Partial<Slot>) =>
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));

  const startGeneration = async () => {
    setPageState('generating');
    setSlots(Array.from({ length: TOTAL }, () => ({ status: 'idle' as SlotStatus })));

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
        const data = JSON.parse((e as MessageEvent).data) as StageStartData;
        updateSlot(index, {
          currentStage: data.stage_name,
          stageIndex: data.stage_index,
          totalStages: data.total_stages,
        });
      });

      es.addEventListener('stage_complete', (e) => {
        const data = JSON.parse((e as MessageEvent).data) as StageCompleteData;
        updateSlot(index, {
          currentStage: data.stage_name,
          stageIndex: data.stage_index,
          totalStages: data.total_stages,
          summary: data.output_summary ?? undefined,
        });
      });

      es.addEventListener('pipeline_complete', (e) => {
        const data = JSON.parse((e as MessageEvent).data) as PipelineCompleteData;
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
    setSlots(Array.from({ length: TOTAL }, () => ({ status: 'idle' as SlotStatus })));
  };

  const reset = () => {
    sourcesRef.current.forEach(es => es.close());
    sourcesRef.current = [];
    void startGeneration();
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

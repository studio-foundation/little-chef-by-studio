"use client";

import { useEffect, useRef, useState } from "react";
import { ProgressBar } from "@/src/components/generate/ProgressBar";
import { RecipeCard } from "@/src/components/generate/RecipeCard";
import { SkeletonCard } from "@/src/components/generate/SkeletonCard";
import {
  GENERATION_MESSAGES,
  SAMPLE_RECIPES,
} from "@/src/components/generate/sampleData";
import PageLayout from "@/src/components/ui/PageLayout";
import { Button } from "@/src/components/ui";
import { useRouter } from "next/navigation";

type GenerationState = "idle" | "generating" | "success";

export default function GeneratePage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [revealed, setRevealed] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const startGeneration = () => {
    setState("generating");
    setRevealed(0);
    setMsgIndex(0);

    let msg = 0;
    msgRef.current = setInterval(() => {
      msg++;
      if (msg < GENERATION_MESSAGES.length - 1) setMsgIndex(msg);
    }, 1800);

    let count = 0;
    intervalRef.current = setInterval(() => {
      count++;
      setRevealed(count);
      if (count >= SAMPLE_RECIPES.length) {
        clearInterval(intervalRef.current!);
        clearInterval(msgRef.current!);
        setMsgIndex(GENERATION_MESSAGES.length - 1);
        timeoutRef.current = setTimeout(() => setState("success"), 800);
      }
    }, 1400);
  };

  const cancel = () => {
    clearInterval(intervalRef.current!);
    clearInterval(msgRef.current!);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState("idle");
    setRevealed(0);
  };

  const reset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState("idle");
    setRevealed(0);
    setMsgIndex(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current!);
      clearInterval(msgRef.current!);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const isIdle = state === "idle";
  const isGenerating = state === "generating";
  const isDone = state === "success";

  return (
    <PageLayout
      title={isDone ? "Ta semaine est prête 🎉" : "Ma semaine"}
      description={
        <>
          {isIdle && "5 repas générés selon tes préférences"}
          {isGenerating && (
            <span key={msgIndex} className="animate-[fadeSlideUp_0.4s_ease]">
              {GENERATION_MESSAGES[msgIndex]}
            </span>
          )}
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
      {/* Progress bar */}
      {isGenerating && (
        <div className="mb-6 animate-[fadeSlideUp_0.3s_ease]">
          <ProgressBar current={revealed} total={SAMPLE_RECIPES.length} />
        </div>
      )}


      {/* Grid recettes */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {isIdle &&
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-white"
            >
              <span className="text-[28px] opacity-40">🍽</span>
              <span className="text-[13px] text-[var(--color-text-muted)]">
                Recette {i + 1}
              </span>
            </div>
          ))}

        {(isGenerating || isDone) &&
          SAMPLE_RECIPES.map((recipe, i) =>
            i < revealed ? (
              <RecipeCard key={i} recipe={recipe} visible />
            ) : (
              <SkeletonCard key={i} />
            ),
          )}
      </div>

      {/* Barre d'action success */}
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
            <Button variant="ghost" size="sm" onClick={() => router.push("/grocery-list")}>📋 Liste d&apos;épicerie</Button>
            <Button variant="primary" size="sm" onClick={() => router.push("/recipes")}>Voir les recettes →</Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

"use client";

import { useState } from "react";
import type { Recipe } from "@/src/components/generate/types";
import { RecipesCard } from "@/src/components/recipes/RecipesCard";
import { RecipeDetail } from "@/src/components/recipes/RecipeDetail";
import { Button } from "@/src/components/ui";
import { useRouter } from "next/navigation";

interface RecipesGridProps {
  recipes: Recipe[];
}

export function RecipesGrid({ recipes }: RecipesGridProps) {
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [regenIds, setRegenIds] = useState<Set<string>>(new Set());

  const router = useRouter();

  const handleRegenerate = (id: string) => {
    setRegenIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setRegenIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2500);
  };

  return (
    <>
      {/* En-tête */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-text)]">
            Mes recettes
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {recipes.length} recettes · Cliquer sur une recette pour les détails
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => router.push("/grocery-list")}>
          📋 Liste d&apos;épicerie
        </Button>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[18px]">
        {recipes.map((recipe) => (
          <div key={recipe.id ?? recipe.name} className="relative">
            {recipe.id !== undefined && regenIds.has(recipe.id) && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl text-[13px] font-semibold text-[var(--color-primary)]"
                style={{
                  background: "rgba(250,248,245,0.85)",
                  backdropFilter: "blur(2px)",
                }}
              >
                <span className="inline-block animate-[spin_1s_linear_infinite] text-2xl">
                  ⟳
                </span>
                Génération…
              </div>
            )}
            <RecipesCard recipe={recipe} onOpen={setSelected} />
          </div>
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <RecipeDetail
          recipe={selected}
          onClose={() => setSelected(null)}
          onRegenerate={handleRegenerate}
        />
      )}
    </>
  );
}

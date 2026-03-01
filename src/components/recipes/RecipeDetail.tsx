"use client";

import { useState } from "react";
import type { Recipe } from "@/src/components/generate/types";
import { Button } from "@/src/components/ui";

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
  onRegenerate: (id: number) => void;
}

function NutritionPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="flex-1 rounded-[10px] px-3.5 py-2.5 text-center"
      style={{ background: color + "22" }}
    >
      <div className="font-[family-name:var(--font-playfair)] text-base font-bold text-[var(--color-text)]">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
        {label}
      </div>
    </div>
  );
}

export function RecipeDetail({
  recipe,
  onClose,
  onRegenerate,
}: RecipeDetailProps) {
  const [regenerating, setRegenerating] = useState(false);

  const handleRegen = () => {
    if (regenerating || recipe.id === undefined) return;
    setRegenerating(true);
    onRegenerate(recipe.id);
    setTimeout(() => setRegenerating(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center animate-[fadeIn_0.2s_ease]"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full overflow-y-auto bg-[var(--color-background)] animate-[slideUp_0.35s_cubic-bezier(0.34,1.2,0.64,1)]"
        style={{
          maxWidth: "680px",
          maxHeight: "92vh",
          borderRadius: "24px 24px 0 0",
        }}
      >
        {/* Hero */}
        <div
          className="relative flex items-center justify-center text-[72px]"
          style={{
            height: "200px",
            background: `linear-gradient(135deg, ${recipe.color} 0%, ${recipe.accent}33 100%)`,
            borderRadius: "24px 24px 0 0",
          }}
        >
          {recipe.emoji}

          {/* Bouton fermer */}
          <Button
            variant="icon"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-4 top-4 text-lg text-[var(--color-text-muted)]"
          >
            ×
          </Button>

          {/* Tags */}
          <div className="absolute bottom-3.5 left-5 flex gap-1.5">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                style={{
                  background: "rgba(255,255,255,0.88)",
                  color: recipe.accent,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="px-6 pb-10 pt-6">
          {/* Titre + meta */}
          <h2 className="mb-2 font-[family-name:var(--font-playfair)] text-2xl font-bold leading-tight text-[var(--color-text)]">
            {recipe.name}
          </h2>
          {recipe.description && (
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              {recipe.description}
            </p>
          )}
          <div className="mb-5 flex gap-4 text-[13px] text-[var(--color-text-muted)]">
            <span>⏱ {recipe.time}</span>
            {recipe.portions && <span>🤜 {recipe.portions} portions</span>}
            <span>🔥 {recipe.kcal}</span>
          </div>

          {/* Nutrition pills */}
          {recipe.protein && recipe.carbs && recipe.fat && (
            <div className="mb-7 flex gap-2">
              <NutritionPill label="Protéines" value={recipe.protein} color="#4CAF50" />
              <NutritionPill label="Glucides" value={recipe.carbs} color="#FF9800" />
              <NutritionPill label="Lipides" value={recipe.fat} color="#9C27B0" />
            </div>
          )}

          {/* Ingrédients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <>
              <h3 className="mb-3 font-[family-name:var(--font-playfair)] text-[17px] font-bold text-[var(--color-text)]">
                Ingrédients
              </h3>
              <ul className="mb-7 list-none p-0">
                {recipe.ingredients.map((ing, i) => (
                  <li
                    key={i}
                    className="flex justify-between border-b border-[var(--color-border)] py-2.5 text-sm"
                  >
                    <span className="text-[var(--color-text)]">{ing.name}</span>
                    <span className="font-semibold text-[var(--color-text-muted)]">
                      {ing.qty}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Étapes */}
          {recipe.steps && recipe.steps.length > 0 && (
            <>
              <h3 className="mb-4 font-[family-name:var(--font-playfair)] text-[17px] font-bold text-[var(--color-text)]">
                Préparation
              </h3>
              <ol className="mb-8 list-none p-0">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="mb-4 flex gap-3.5">
                    <span
                      className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                      style={{
                        background: recipe.color,
                        color: recipe.accent,
                      }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-[15px] leading-relaxed text-[var(--color-text)]">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-2.5">
            <Button
              variant="outline"
              onClick={handleRegen}
              isLoading={regenerating}
              className="flex-1"
            >
              {regenerating ? "Génération…" : "↺ Régénérer cette recette"}
            </Button>
            <Button variant="primary" className="flex-1">⭐ Sauvegarder</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

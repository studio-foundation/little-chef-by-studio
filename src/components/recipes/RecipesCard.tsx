"use client";

import { useState } from "react";
import type { Recipe } from "@/src/components/generate/types";
import { Button } from "@/src/components/ui";

interface RecipesCardProps {
  recipe: Recipe;
  onOpen: (recipe: Recipe) => void;
}

export function RecipesCard({ recipe, onOpen }: RecipesCardProps) {
  const [isFav, setIsFav] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onOpen(recipe)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative cursor-pointer overflow-hidden rounded-2xl bg-white transition-all duration-200"
      style={{
        boxShadow: hovered
          ? "0 8px 24px rgba(0,0,0,0.10)"
          : "0 2px 12px rgba(0,0,0,0.06)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
      }}
    >
      {/* Zone image */}
      <div
        className="relative flex h-40 items-center justify-center text-[52px]"
        style={{
          background: `linear-gradient(135deg, ${recipe.color} 0%, ${recipe.accent}22 100%)`,
        }}
      >
        {recipe.emoji}

        {/* Bouton favori — haut droite */}
        <Button
          variant="icon"
          onClick={(e) => {
            e.stopPropagation();
            setIsFav(!isFav);
          }}
          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
          className="absolute right-2.5 top-2.5 h-8 w-8 text-[15px]"
        >
          {isFav ? "♥" : "♡"}
        </Button>

        {/* Badges temps / kcal — bas GAUCHE */}
        <div className="absolute bottom-2.5 left-2.5 flex gap-1.5">
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-muted)]">
            ⏱ {recipe.time}
          </span>
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-muted)]">
            🔥 {recipe.kcal}
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-4 pb-4 pt-3.5">
        <h3 className="mb-1.5 font-[family-name:var(--font-playfair)] text-[15px] font-bold leading-snug text-[var(--color-text)]">
          {recipe.name}
        </h3>
        {recipe.description && (
          <p className="mb-2.5 text-[12px] leading-snug text-[var(--color-text-muted)]">
            {recipe.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: recipe.color, color: recipe.accent }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

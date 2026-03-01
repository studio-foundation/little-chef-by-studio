"use client";

import { useEffect, useState } from "react";
import type { Recipe } from "./types";

interface RecipeCardProps {
  recipe: Recipe;
  visible: boolean;
}

export function RecipeCard({ recipe, visible }: RecipeCardProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShow(true), 80);
      return () => clearTimeout(t);
    }
  }, [visible]);

  return (
    <div
      className="cursor-pointer overflow-hidden rounded-2xl bg-white transition-all duration-500"
      style={{
        boxShadow: show
          ? "0 4px 20px rgba(0,0,0,0.08)"
          : "0 2px 8px rgba(0,0,0,0.04)",
        transform: show ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
        opacity: show ? 1 : 0,
        transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {/* Zone image */}
      <div
        className="relative flex h-40 items-center justify-center text-[52px]"
        style={{
          background: `linear-gradient(135deg, ${recipe.color} 0%, ${recipe.accent}22 100%)`,
        }}
      >
        <span
          className="transition-transform duration-500"
          style={{
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
            transform: show ? "scale(1)" : "scale(0.7)",
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            transitionDelay: "0.2s",
          }}
        >
          {recipe.emoji}
        </span>
        {/* Badges temps / kcal */}
        <div className="absolute bottom-2.5 right-2.5 flex gap-2">
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-muted)]">
            ⏱ {recipe.time}
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-muted)]">
            🔥 {recipe.kcal}
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-4 pb-4 pt-3">
        <h3 className="mb-1.5 font-[family-name:var(--font-playfair)] text-[15px] font-bold leading-snug text-[var(--color-text)]">
          {recipe.name}
        </h3>
        <p className="mb-3 text-[13px] leading-snug text-[var(--color-text-muted)]">
          {recipe.desc}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
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

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/src/components/ui";
import type { GroceryGroup } from "@/app/api/grocery-list/route";

const STORAGE_KEY = "grocery-checked";

function formatWeekStart(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
}

function buildExportText(
  groups: GroceryGroup[],
  checked: Set<string>,
): string {
  return groups
    .map((group) => {
      const remaining = group.items.filter((i) => !checked.has(i.id));
      if (remaining.length === 0) return null;
      const lines = remaining.map((i) => `  • ${i.name} — ${i.qty}`).join("\n");
      return `${group.rayon}\n${lines}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function GroceryGroupCard({
  group,
  checked,
  onToggle,
}: {
  group: GroceryGroup;
  checked: Set<string>;
  onToggle: (id: string) => void;
}) {
  const total = group.items.length;
  const done = group.items.filter((i) => checked.has(i.id)).length;
  const allDone = done === total;

  return (
    <div
      className="mb-3.5 overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-opacity duration-300"
      style={{ opacity: allDone ? 0.6 : 1 }}
    >
      <div
        className="flex items-center justify-between px-[18px] py-3"
        style={{ background: group.bg }}
      >
        <span className="font-[family-name:var(--font-playfair)] text-[15px] font-bold text-[var(--color-text)]">
          {group.rayon}
        </span>
        <span
          className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-semibold"
          style={{ color: group.accent }}
        >
          {done}/{total}
        </span>
      </div>

      <div>
        {group.items.map((item, i) => {
          const isChecked = checked.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              className={[
                "flex w-full cursor-pointer items-center gap-3.5 px-[18px] py-3 text-left transition-colors",
                i < group.items.length - 1
                  ? "border-b border-[var(--color-border)]"
                  : "",
                isChecked ? "bg-[#fafaf8]" : "bg-white hover:bg-[#fdf9f6]",
              ].join(" ")}
            >
              <div
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200"
                style={{
                  borderColor: isChecked ? group.accent : "#ddd",
                  background: isChecked ? group.accent : "#fff",
                  transform: isChecked ? "scale(1.05)" : "scale(1)",
                }}
              >
                {isChecked && (
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                    <path
                      d="M1 4L4.5 7.5L11 1"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              <span
                className={`flex-1 text-[15px] transition-all duration-200 ${
                  isChecked
                    ? "text-[#bbb] line-through"
                    : "text-[var(--color-text)]"
                }`}
              >
                {item.name}
              </span>

              <span
                className={`shrink-0 text-[13px] font-semibold transition-colors duration-200 ${
                  isChecked ? "text-[#ccc]" : "text-[var(--color-text-muted)]"
                }`}
              >
                {item.qty}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GroceryListClient({
  groups,
  weekStart,
}: {
  groups: GroceryGroup[];
  weekStart: string;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const allIds = groups.flatMap((g) => g.items.map((i) => i.id));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setChecked(new Set(JSON.parse(saved) as string[]));
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
      } catch {
        // ignore storage errors
      }
      return s;
    });
  };

  const totalItems = allIds.length;
  const doneItems = checked.size;
  const progress = totalItems > 0 ? (doneItems / totalItems) * 100 : 0;

  const handleCopy = () => {
    const text = buildExportText(groups, checked);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mx-auto max-w-xl pb-20">
      <div className="mb-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-text)]">
              Liste d&apos;épicerie
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Semaine du {formatWeekStart(weekStart)} · {totalItems} articles · 5 recettes
            </p>
          </div>
          <Button
            variant={copied ? "ghost" : "outline"}
            size="sm"
            onClick={handleCopy}
          >
            {copied ? "✓ Copié !" : "📋 Tout copier"}
          </Button>
        </div>

        <div>
          <div className="mb-1.5 flex justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">
              {doneItems === 0
                ? "Aucun article coché"
                : doneItems === totalItems
                  ? "Tout est dans le panier 🛒"
                  : `${doneItems} article${doneItems > 1 ? "s" : ""} coché${doneItems > 1 ? "s" : ""}`}
            </span>
            {doneItems > 0 && (
              <button
                onClick={() => {
                  setChecked(new Set());
                  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
                }}
                className="text-xs text-[var(--color-text-muted)] underline hover:text-[var(--color-text)]"
              >
                Tout décocher
              </button>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[var(--color-secondary)] transition-[width] duration-500 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {groups.map((group) => (
        <GroceryGroupCard
          key={group.rayon}
          group={group}
          checked={checked}
          onToggle={toggle}
        />
      ))}

      {doneItems === totalItems && totalItems > 0 && (
        <div className="animate-[fadeSlideUp_0.4s_ease] py-8 text-center">
          <div className="mb-3 text-5xl">🛒</div>
          <p className="mb-1.5 font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--color-text)]">
            Courses terminées !
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Tout est dans le panier. Bonne cuisine.
          </p>
        </div>
      )}
    </div>
  );
}

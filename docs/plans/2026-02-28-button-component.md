# Button Component Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a reusable `Button` component with 4 variants (primary, outline, ghost, icon), `isLoading` prop, and `asChild` support — then replace all inline button styles across the codebase.

**Architecture:** Single `Button` component with variant/size props and a minimal Slot for `asChild`. No external dependencies. Exported from a `src/components/ui/` barrel.

**Tech Stack:** React 19, TypeScript 5, Tailwind v4, Next.js 16 App Router

---

### Task 1: Create `src/components/ui/Button.tsx`

**Files:**
- Create: `src/components/ui/Button.tsx`

**Step 1: Create the file with the full implementation**

```tsx
"use client";

import React from "react";

// Minimal Slot — clones the child element injecting button props
function Slot({
  children,
  ...props
}: { children: React.ReactElement } & React.HTMLAttributes<HTMLElement>) {
  return React.cloneElement(children, {
    ...props,
    ...children.props,
    className: [props.className, children.props.className]
      .filter(Boolean)
      .join(" "),
  });
}

const variantClasses = {
  primary:
    "rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(196,96,45,0.35)] active:translate-y-0",
  outline:
    "rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:bg-[#f5f5f5]",
  ghost:
    "rounded-xl bg-[#f5f1eb] text-[var(--color-primary)] hover:bg-[#ede8e1]",
  icon: "h-9 w-9 rounded-full bg-white/85 hover:bg-white hover:scale-110",
};

const sizeClasses = {
  sm: "px-5 py-2.5 text-sm",
  md: "px-6 py-3 text-sm font-semibold",
  lg: "px-7 py-3 text-[15px] font-bold shadow-[0_4px_16px_rgba(196,96,45,0.3)]",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "icon";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  asChild?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  asChild = false,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isIcon = variant === "icon";

  const classes = [
    "inline-flex items-center justify-center transition-all",
    variantClasses[variant],
    !isIcon ? sizeClasses[size] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (asChild && React.isValidElement(children)) {
    return (
      <Slot {...(props as React.HTMLAttributes<HTMLElement>)} className={classes}>
        {children as React.ReactElement}
      </Slot>
    );
  }

  const content = isLoading ? (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block animate-[spin_1s_linear_infinite]">⟳</span>
      {children}
    </span>
  ) : (
    children
  );

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {content}
    </button>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm build`
Expected: No TypeScript errors on the new file (other pages may still have warnings — OK at this stage)

**Step 3: Commit**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat(ui): add Button component with variant/size/isLoading/asChild"
```

---

### Task 2: Create barrel export `src/components/ui/index.ts`

**Files:**
- Create: `src/components/ui/index.ts`

**Step 1: Create the file**

```ts
export { Button } from "./Button";
export type { ButtonProps } from "./Button";
```

**Step 2: Commit**

```bash
git add src/components/ui/index.ts
git commit -m "chore(ui): add ui barrel export"
```

---

### Task 3: Refactor `app/(app)/generate/page.tsx`

**Files:**
- Modify: `app/(app)/generate/page.tsx`

The page has 4 inline `<button>` elements to replace:

1. **Bouton Annuler** (line ~99) — `outline` / `sm`
2. **Bouton Générer / Regénérer** (line ~106) — `primary` / `lg`
3. **Bouton Liste d'épicerie** (line ~160) — `ghost` / `sm`
4. **Bouton Voir les recettes** (line ~163) — `primary` / `sm`

**Step 1: Add import at the top of the file**

```tsx
import { Button } from "@/src/components/ui";
```

**Step 2: Replace bouton Annuler**

Old:
```tsx
<button
  onClick={cancel}
  className="rounded-xl border border-[var(--color-border)] bg-white px-5 py-2.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[#f5f5f5]"
>
  Annuler
</button>
```

New:
```tsx
<Button variant="outline" size="sm" onClick={cancel}>
  Annuler
</Button>
```

**Step 3: Replace bouton Générer / Regénérer**

Old:
```tsx
<button
  onClick={isDone ? reset : startGeneration}
  className="rounded-xl bg-[var(--color-primary)] px-7 py-3 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(196,96,45,0.3)] transition-all hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] hover:shadow-[0_8px_24px_rgba(196,96,45,0.35)] active:translate-y-0"
>
  {isDone ? "↺ Regénérer" : "✨ Générer ma semaine"}
</button>
```

New:
```tsx
<Button variant="primary" size="lg" onClick={isDone ? reset : startGeneration}>
  {isDone ? "↺ Regénérer" : "✨ Générer ma semaine"}
</Button>
```

**Step 4: Replace bouton Liste d'épicerie**

Old:
```tsx
<button className="rounded-xl bg-[#f5f1eb] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[#ede8e1]">
  📋 Liste d'épicerie
</button>
```

New:
```tsx
<Button variant="ghost" size="sm">📋 Liste d'épicerie</Button>
```

**Step 5: Replace bouton Voir les recettes**

Old:
```tsx
<button className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]">
  Voir les recettes →
</button>
```

New:
```tsx
<Button variant="primary" size="sm">Voir les recettes →</Button>
```

**Step 6: Run build to verify**

Run: `pnpm build`
Expected: No errors

**Step 7: Commit**

```bash
git add app/(app)/generate/page.tsx
git commit -m "refactor(generate): use Button component"
```

---

### Task 4: Refactor `src/components/recipes/RecipeDetail.tsx`

**Files:**
- Modify: `src/components/recipes/RecipeDetail.tsx`

2 boutons à remplacer :

1. **Bouton fermer** (ligne ~77) — `icon`
2. **Bouton Régénérer** (ligne ~177) — `outline` / `md` avec `isLoading`
3. **Bouton Sauvegarder** (ligne ~191) — `primary` / `md`

**Step 1: Add import**

```tsx
import { Button } from "@/src/components/ui";
```

**Step 2: Replace bouton fermer**

Old:
```tsx
<button
  onClick={onClose}
  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-lg text-[var(--color-text-muted)] hover:bg-white"
>
  ×
</button>
```

New:
```tsx
<Button
  variant="icon"
  onClick={onClose}
  aria-label="Fermer"
  className="absolute right-4 top-4 text-lg text-[var(--color-text-muted)]"
>
  ×
</Button>
```

**Step 3: Replace bouton Régénérer**

Old:
```tsx
<button
  onClick={handleRegen}
  disabled={regenerating}
  className="flex-1 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3.5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[#f5f1eb] disabled:cursor-not-allowed disabled:opacity-60"
>
  {regenerating ? (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block animate-[spin_1s_linear_infinite]">⟳</span>
      Génération…
    </span>
  ) : (
    "↺ Régénérer cette recette"
  )}
</button>
```

New:
```tsx
<Button
  variant="outline"
  onClick={handleRegen}
  isLoading={regenerating}
  className="flex-1"
>
  {regenerating ? "Génération…" : "↺ Régénérer cette recette"}
</Button>
```

**Step 4: Replace bouton Sauvegarder**

Old:
```tsx
<button className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)]">
  ⭐ Sauvegarder
</button>
```

New:
```tsx
<Button variant="primary" className="flex-1">⭐ Sauvegarder</Button>
```

**Step 5: Run build to verify**

Run: `pnpm build`
Expected: No errors

**Step 6: Commit**

```bash
git add src/components/recipes/RecipeDetail.tsx
git commit -m "refactor(recipes): use Button component in RecipeDetail"
```

---

### Task 5: Refactor `src/components/recipes/RecipesCard.tsx`

**Files:**
- Modify: `src/components/recipes/RecipesCard.tsx`

1 bouton à remplacer :

1. **Bouton favori** (ligne ~38) — `icon`

**Step 1: Add import**

```tsx
import { Button } from "@/src/components/ui";
```

**Step 2: Replace bouton favori**

Old:
```tsx
<button
  onClick={(e) => {
    e.stopPropagation();
    setIsFav(!isFav);
  }}
  className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-[15px] transition-transform hover:scale-110"
>
  {isFav ? "♥" : "♡"}
</button>
```

New:
```tsx
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
```

**Step 3: Run final build to verify everything**

Run: `pnpm build`
Expected: Build réussi, aucune erreur TypeScript

**Step 4: Commit final**

```bash
git add src/components/recipes/RecipesCard.tsx
git commit -m "refactor(recipes): use Button component in RecipesCard"
```

---

### Task 6: Verification visuelle

**Step 1: Démarrer le serveur de développement**

Run: `pnpm dev`

**Step 2: Vérifier chaque page**

- `/generate` — boutons Générer/Regénérer (primary lg), Annuler (outline sm), Liste d'épicerie (ghost sm), Voir les recettes (primary sm)
- `/recipes` — bouton favori (icon), boutons Régénérer + Sauvegarder dans la modal (outline + primary)
- Vérifier l'état `isLoading` en cliquant "Régénérer cette recette" dans la modal

**Step 3: Si tout est correct — créer la PR**

```bash
git push -u origin <branch-name>
gh pr create --title "feat(ui): add reusable Button component" --body "$(cat <<'EOF'
## Summary
- Ajoute `src/components/ui/Button.tsx` avec variants primary/outline/ghost/icon
- Support `isLoading`, `asChild`, `size` (sm/md/lg)
- Remplace tous les `<button>` inline dans generate, RecipeDetail, RecipesCard

## Test plan
- [ ] `/generate` — CTA, Annuler, Liste d'épicerie, Voir les recettes
- [ ] `/recipes` — favori (icon), modal Régénérer (isLoading), Sauvegarder
- [ ] `pnpm build` passe sans erreur
EOF
)" --base main`

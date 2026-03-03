import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import { RecipesGrid } from "./RecipesGrid";
import type { Recipe } from "@/src/components/generate/types";

type DbStep = { order: number; title: string; instructions: string[] };
type DbIngredient = { name: string; quantity: string };
type DbNotes = { chef?: string[]; nutrition?: string } | null;

const CUISINE_COLORS: Record<string, { color: string; accent: string }> = {
  japonaise:   { color: '#FFF3E0', accent: '#FF9800' },
  italienne:   { color: '#FCE4EC', accent: '#E91E63' },
  indienne:    { color: '#FFF8E1', accent: '#FFC107' },
  mexicaine:   { color: '#FFF8E1', accent: '#FF5722' },
  française:   { color: '#E8F4FD', accent: '#1565C0' },
  asiatique:   { color: '#F3E5F5', accent: '#9C27B0' },
  américaine:  { color: '#FBE9E7', accent: '#FF5722' },
  default:     { color: '#E8F5E9', accent: '#4CAF50' },
};

function cuisineToColors(cuisine: string | null): { color: string; accent: string } {
  if (!cuisine) return CUISINE_COLORS.default;
  return CUISINE_COLORS[cuisine.toLowerCase()] ?? CUISINE_COLORS.default;
}

function dbToRecipe(r: {
  id: string;
  title: string;
  cuisine: string | null;
  timeMinutes: number | null;
  calories: number | null;
  portions: number | null;
  emoji: string | null;
  ingredients: unknown;
  steps: unknown;
  notes: unknown;
}): Recipe {
  const steps = (r.steps as DbStep[]) ?? [];
  const ingredients = (r.ingredients as DbIngredient[]) ?? [];
  const notes = r.notes as DbNotes;

  return {
    id: r.id,
    name: r.title,
    time: r.timeMinutes ? `${r.timeMinutes} min` : '—',
    kcal: r.calories ? `${r.calories} kcal` : '—',
    tags: [],
    emoji: r.emoji ?? '🍽️',
    ...cuisineToColors(r.cuisine),
    desc: notes?.chef?.[0] ?? steps[0]?.title ?? '',
    description: notes?.chef?.join(' ') ?? '',
    portions: r.portions ?? undefined,
    ingredients: ingredients.map(i => ({ qty: i.quantity, name: i.name })),
    steps: steps.flatMap(s => s.instructions),
  };
}

export default async function RecipesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  let recipes: Recipe[] = [];
  try {
    const latestPlan = await prisma.weeklyPlan.findFirst({
      where: { userId: session.user.id, recipes: { some: {} } },
      orderBy: { weekStart: 'desc' },
      include: {
        recipes: {
          include: { recipe: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    recipes = (latestPlan?.recipes ?? []).map((wpr) => dbToRecipe(wpr.recipe));
  } catch (err) {
    console.error('[RecipesPage] DB error', err);
  }

  return <RecipesGrid recipes={recipes} />;
}

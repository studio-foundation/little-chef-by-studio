import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/src/lib/prisma';
import type { Recipe } from '@/src/components/generate/types';

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
  const key = cuisine.toLowerCase();
  return CUISINE_COLORS[key] ?? CUISINE_COLORS.default;
}

type DbStep = { order: number; title: string; instructions: string[] };
type DbIngredient = { name: string; quantity: string };
type DbNotes = { chef?: string[]; nutrition?: string } | null;

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

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawLimit = parseInt(req.nextUrl.searchParams.get('limit') ?? '5', 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 20) : 5;

  try {
    const dbRecipes = await prisma.recipe.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const recipes: Recipe[] = dbRecipes.map(dbToRecipe);
    return NextResponse.json(recipes);
  } catch (err) {
    console.error('[GET /api/recipes]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/src/lib/prisma';

// --- Types ---

type DbItem = { name: string; quantity: string; group: string };

export type GroceryGroup = {
  rayon: string;
  bg: string;
  accent: string;
  items: { id: string; name: string; qty: string }[];
};

// --- Mapping group → rayon ---

type RayonConfig = { rayon: string; bg: string; accent: string };

const RAYON_MAP: { keywords: string[]; config: RayonConfig }[] = [
  {
    keywords: ['légume', 'fruit', 'légumes & fruits'],
    config: { rayon: '🥬 Légumes & fruits', bg: '#EDF3EE', accent: '#4a7c59' },
  },
  {
    keywords: ['protéine', 'viande', 'poisson', 'volaille'],
    config: { rayon: '🥩 Protéines', bg: '#FAF0EE', accent: '#C4602D' },
  },
  {
    keywords: ['épicerie sèche', 'féculent', 'céréale', 'pâte', 'riz', 'légumineuse'],
    config: { rayon: '🌾 Épicerie sèche', bg: '#FAF4EB', accent: '#A87C3A' },
  },
  {
    keywords: ['condiment', 'sauce'],
    config: { rayon: '🧴 Condiments & sauces', bg: '#F3EDF7', accent: '#8B5BA8' },
  },
  {
    keywords: ['épice', 'aromate'],
    config: { rayon: '🧂 Épices & aromates', bg: '#FAF6E8', accent: '#A87C3A' },
  },
  {
    keywords: ['produit frais', 'frais', 'laitier', 'fromage'],
    config: { rayon: '🧀 Frais & autres', bg: '#EEF4FA', accent: '#4A6F96' },
  },
];

const FALLBACK_RAYON: RayonConfig = {
  rayon: '📦 Autres',
  bg: '#F5F5F0',
  accent: '#888',
};

function groupToRayon(group: string): RayonConfig {
  const normalized = group.toLowerCase().trim();
  for (const { keywords, config } of RAYON_MAP) {
    if (keywords.some((kw) => normalized.includes(kw))) return config;
  }
  return FALLBACK_RAYON;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function transformItems(items: DbItem[]): GroceryGroup[] {
  const byGroup = new Map<string, { config: RayonConfig; items: DbItem[] }>();

  for (const item of items) {
    const config = groupToRayon(item.group ?? '');
    const key = config.rayon;
    if (!byGroup.has(key)) byGroup.set(key, { config, items: [] });
    byGroup.get(key)!.items.push(item);
  }

  return [...byGroup.entries()].map(([, { config, items }]) => ({
    rayon: config.rayon,
    bg: config.bg,
    accent: config.accent,
    items: items.map((i) => ({
      id: slugify(i.name),
      name: i.name,
      qty: i.quantity,
    })),
  }));
}

// --- Route ---

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const plan = await prisma.weeklyPlan.findFirst({
      where: {
        userId: session.user.id,
        GroceryList: { isNot: null },
      },
      orderBy: { weekStart: 'desc' },
      include: { GroceryList: true },
    });

    if (!plan?.GroceryList) {
      return NextResponse.json({ empty: true });
    }

    const rawItems = plan.GroceryList.items as DbItem[];
    const groups = transformItems(rawItems);

    return NextResponse.json({
      weekStart: plan.weekStart.toISOString(),
      groups,
    });
  } catch (err) {
    console.error('[GET /api/grocery-list]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

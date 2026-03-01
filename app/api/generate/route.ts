import { NextResponse } from 'next/server';
import { startRun, type RecipeInput } from '@/src/lib/studio/client';

// 5 recettes MVP — remplacées par le profil utilisateur plus tard
const RECIPE_REQUESTS: RecipeInput[] = [
  { dish_name: 'Ramen tonkotsu végétalien', constraints: ['sans produits animaux', '90 min max', '4 personnes'] },
  { dish_name: 'Buddha bowl quinoa', constraints: ['sans gluten', '30 min max', '2 personnes'] },
  { dish_name: 'Curry de pois chiches', constraints: ['végétalien', '45 min max', '4 personnes'] },
  { dish_name: 'Pâtes primavera', constraints: ['végétarien', '30 min max', '2 personnes'] },
  { dish_name: 'Soupe miso aux légumes', constraints: ['sans gluten', '20 min max', '2 personnes'] },
];

export async function POST() {
  try {
    const runs = await Promise.all(RECIPE_REQUESTS.map(startRun));
    return NextResponse.json({ runs });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Studio API unreachable';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { startRun } from '@/src/lib/studio/client';

const DISH_REQUESTS = [
  { dish_name: 'Ramen tonkotsu végétalien', constraints: ['sans produits animaux', '90 min max', '4 personnes'] },
  { dish_name: 'Buddha bowl quinoa', constraints: ['sans gluten', '30 min max', '2 personnes'] },
  { dish_name: 'Curry de pois chiches', constraints: ['végétalien', '45 min max', '4 personnes'] },
  { dish_name: 'Pâtes primavera', constraints: ['végétarien', '30 min max', '2 personnes'] },
  { dish_name: 'Soupe miso aux légumes', constraints: ['sans gluten', '20 min max', '2 personnes'] },
];

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const runs: Awaited<ReturnType<typeof startRun>>[] = [];
    for (const dish of DISH_REQUESTS) {
      runs.push(await startRun({ ...dish, userId: session.user.id }));
    }
    return NextResponse.json({ runs });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Studio API unreachable';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

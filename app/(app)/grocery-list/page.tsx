import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { GroceryListClient } from './GroceryListClient';
import type { GroceryGroup } from '@/app/api/grocery-list/route';

type ApiResponse =
  | { empty: true }
  | { weekStart: string; groups: GroceryGroup[] };

export default async function GroceryListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  let data: ApiResponse = { empty: true };

  try {
    const cookieStore = await cookies();
    const res = await fetch(`${baseUrl}/api/grocery-list`, {
      cache: 'no-store',
      headers: { cookie: cookieStore.toString() },
    });
    if (res.ok) {
      data = (await res.json()) as ApiResponse;
    }
  } catch (err) {
    console.error('[GroceryListPage] fetch error', err);
  }

  if ('empty' in data) {
    return (
      <div className="mx-auto max-w-xl pb-20">
        <h1 className="mb-1 font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-text)]">
          Liste d&apos;épicerie
        </h1>
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="text-5xl">🛒</div>
          <p className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--color-text)]">
            Aucune liste d&apos;épicerie
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Génère ton premier plan de semaine pour voir ta liste apparaître ici.
          </p>
          <Link
            href="/generate"
            className="mt-2 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Générer un plan
          </Link>
        </div>
      </div>
    );
  }

  return <GroceryListClient groups={data.groups} weekStart={data.weekStart} />;
}

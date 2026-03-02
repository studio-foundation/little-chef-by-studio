import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const STUDIO_URL = process.env.NEXT_PUBLIC_API_URL;
  if (!STUDIO_URL) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_API_URL is not set' }, { status: 500 });
  }

  const body = await req.json() as Record<string, unknown>;
  const res = await fetch(`${STUDIO_URL}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}

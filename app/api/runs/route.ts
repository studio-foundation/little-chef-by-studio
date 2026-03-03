import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/src/lib/prisma';

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
  const input = body.input as Record<string, unknown> | undefined;
  const enrichedInput: Record<string, unknown> = { ...input, userId: session.user.id };

  if (body.pipeline === 'meal-planner-weekly') {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const plan = await prisma.weeklyPlan.create({
      data: { userId: session.user.id, weekStart },
    });
    enrichedInput.planId = plan.id;
  }

  const bodyWithUser = { ...body, input: enrichedInput };
  const res = await fetch(`${STUDIO_URL}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyWithUser),
  });

  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}

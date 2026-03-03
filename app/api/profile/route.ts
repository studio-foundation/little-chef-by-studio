import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/src/lib/prisma'

const VALID_BUDGETS = ['low', 'medium', 'flexible'] as const
type Budget = typeof VALID_BUDGETS[number]

function isValidBudget(v: unknown): v is Budget {
  return typeof v === 'string' && (VALID_BUDGETS as readonly string[]).includes(v)
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(x => typeof x === 'string')
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const currentMonth = new Date().toISOString().slice(0, 7)

    const [profile, quota] = await Promise.all([
      prisma.userProfile.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id },
        update: {},
      }),
      prisma.chatQuota.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, month: currentMonth, used: 0, max: 10 },
        update: {},
      }),
    ])

    const effectiveQuota = quota.month === currentMonth
      ? quota
      : await prisma.chatQuota.update({
          where: { userId: session.user.id },
          data: { month: currentMonth, used: 0 },
        })

    return NextResponse.json({
      profile: {
        dietary: profile.dietary,
        dislikes: profile.dislikes,
        cuisines: profile.cuisines,
        mealsPerWeek: profile.mealsPerWeek,
        portions: profile.portions,
        maxTimeMinutes: profile.maxTimeMinutes,
        budgetWeekly: profile.budgetWeekly,
        onboardingCompleted: profile.onboardingCompleted,
        onboardingCompletedAt: profile.onboardingCompletedAt?.toISOString() ?? null,
      },
      quota: {
        used: effectiveQuota.used,
        max: effectiveQuota.max,
        month: effectiveQuota.month,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  // Validate fields if present
  if ('budgetWeekly' in b && !isValidBudget(b.budgetWeekly)) {
    return NextResponse.json({ error: 'Invalid budgetWeekly' }, { status: 400 })
  }
  if ('mealsPerWeek' in b && !isPositiveInt(b.mealsPerWeek)) {
    return NextResponse.json({ error: 'Invalid mealsPerWeek' }, { status: 400 })
  }
  if ('portions' in b && !isPositiveInt(b.portions)) {
    return NextResponse.json({ error: 'Invalid portions' }, { status: 400 })
  }
  if ('maxTimeMinutes' in b && !isPositiveInt(b.maxTimeMinutes)) {
    return NextResponse.json({ error: 'Invalid maxTimeMinutes' }, { status: 400 })
  }
  if ('dietary' in b && !isStringArray(b.dietary)) {
    return NextResponse.json({ error: 'Invalid dietary' }, { status: 400 })
  }
  if ('dislikes' in b && !isStringArray(b.dislikes)) {
    return NextResponse.json({ error: 'Invalid dislikes' }, { status: 400 })
  }
  if ('cuisines' in b && !isStringArray(b.cuisines)) {
    return NextResponse.json({ error: 'Invalid cuisines' }, { status: 400 })
  }

  try {
    const profile = await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        dietary: isStringArray(b.dietary) ? b.dietary : [],
        dislikes: isStringArray(b.dislikes) ? b.dislikes : [],
        cuisines: isStringArray(b.cuisines) ? b.cuisines : [],
        mealsPerWeek: isPositiveInt(b.mealsPerWeek) ? b.mealsPerWeek : 5,
        portions: isPositiveInt(b.portions) ? b.portions : 2,
        maxTimeMinutes: isPositiveInt(b.maxTimeMinutes) ? b.maxTimeMinutes : 30,
        budgetWeekly: isValidBudget(b.budgetWeekly) ? b.budgetWeekly : 'medium',
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
      update: {
        ...('dietary' in b && { dietary: b.dietary as string[] }),
        ...('dislikes' in b && { dislikes: b.dislikes as string[] }),
        ...('cuisines' in b && { cuisines: b.cuisines as string[] }),
        ...('mealsPerWeek' in b && { mealsPerWeek: b.mealsPerWeek as number }),
        ...('portions' in b && { portions: b.portions as number }),
        ...('maxTimeMinutes' in b && { maxTimeMinutes: b.maxTimeMinutes as number }),
        ...('budgetWeekly' in b && { budgetWeekly: b.budgetWeekly as string }),
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    })

    return NextResponse.json({
      dietary: profile.dietary,
      dislikes: profile.dislikes,
      cuisines: profile.cuisines,
      mealsPerWeek: profile.mealsPerWeek,
      portions: profile.portions,
      maxTimeMinutes: profile.maxTimeMinutes,
      budgetWeekly: profile.budgetWeekly,
      onboardingCompleted: profile.onboardingCompleted,
      onboardingCompletedAt: profile.onboardingCompletedAt?.toISOString() ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

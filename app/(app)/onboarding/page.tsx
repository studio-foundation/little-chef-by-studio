// app/(app)/onboarding/page.tsx
import { auth } from "@/auth"
import { prisma } from "@/src/lib/prisma"
import { redirect } from "next/navigation"
import { OnboardingPageClient } from "./OnboardingPageClient"

const VALID_BUDGETS = ["low", "medium", "flexible"] as const
type BudgetWeekly = typeof VALID_BUDGETS[number]

function toValidBudget(v: string): BudgetWeekly {
  return (VALID_BUDGETS as readonly string[]).includes(v) ? v as BudgetWeekly : "medium"
}

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const currentMonth = new Date().toISOString().slice(0, 7)

  let profile, quota
  try {
    [profile, quota] = await Promise.all([
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
  } catch {
    // Let Next.js error boundary handle it
    throw new Error("Impossible de charger ton profil. Réessaie.")
  }

  // Reset quota if month changed
  let effectiveQuota
  try {
    effectiveQuota = quota.month === currentMonth
      ? quota
      : await prisma.chatQuota.update({
          where: { userId: session.user.id },
          data: { month: currentMonth, used: 0 },
        })
  } catch {
    effectiveQuota = quota // fallback: use potentially stale quota
  }

  return (
    <OnboardingPageClient
      profile={{
        dietary: profile.dietary,
        dislikes: profile.dislikes,
        cuisines: profile.cuisines,
        mealsPerWeek: profile.mealsPerWeek,
        portions: profile.portions,
        maxTimeMinutes: profile.maxTimeMinutes,
        budgetWeekly: toValidBudget(profile.budgetWeekly),
        onboardingCompleted: profile.onboardingCompleted,
        onboardingCompletedAt: profile.onboardingCompletedAt?.toISOString() ?? null,
      }}
      quota={{
        used: effectiveQuota.used,
        max: effectiveQuota.max,
        month: effectiveQuota.month,
      }}
    />
  )
}

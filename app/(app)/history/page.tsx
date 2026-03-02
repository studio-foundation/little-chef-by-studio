import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/src/lib/prisma'
import { HistoryView } from '@/src/components/history/HistoryView'
import type { WeekWithRecipes } from '@/src/components/history/types'

export default async function HistoryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const weeklyPlans = await prisma.weeklyPlan.findMany({
    where: { userId: session.user.id },
    orderBy: { weekStart: 'desc' },
    include: {
      recipes: {
        include: { recipe: true },
        orderBy: { position: 'asc' },
      },
    },
  })

  const weeks: WeekWithRecipes[] = weeklyPlans.map(plan => ({
    id: plan.id,
    weekStart: plan.weekStart,
    recipes: plan.recipes.map(wpr => ({
      id: wpr.recipe.id,
      title: wpr.recipe.title,
      cuisine: wpr.recipe.cuisine,
      timeMinutes: wpr.recipe.timeMinutes,
      emoji: wpr.recipe.emoji,
      isFavorite: wpr.recipe.isFavorite,
    })),
  }))

  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--color-text)]">
        Historique
      </h1>
      <p className="mb-6 mt-1 text-sm text-[#a89880]">
        {weeks.length} semaine{weeks.length !== 1 ? 's' : ''} générée{weeks.length !== 1 ? 's' : ''}
      </p>
      <HistoryView weeks={weeks} />
    </div>
  )
}

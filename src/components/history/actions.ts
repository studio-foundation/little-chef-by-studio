'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/src/lib/prisma'

export async function toggleFavorite(recipeId: string): Promise<void> {
  const recipe = await prisma.recipe.findUniqueOrThrow({
    where: { id: recipeId },
    select: { isFavorite: true },
  })
  await prisma.recipe.update({
    where: { id: recipeId },
    data: { isFavorite: !recipe.isFavorite },
  })
  revalidatePath('/history')
}

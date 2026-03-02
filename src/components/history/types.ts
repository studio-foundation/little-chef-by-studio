export type RecipeInWeek = {
  id: string
  title: string
  cuisine: string | null
  timeMinutes: number | null
  emoji: string | null
  isFavorite: boolean
}

export type WeekWithRecipes = {
  id: string
  weekStart: Date
  recipes: RecipeInWeek[]
}

// src/types/profile.ts

export interface UserProfile {
  dietary: string[]
  dislikes: string[]
  cuisines: string[]
  mealsPerWeek: number
  portions: number
  maxTimeMinutes: number
  budgetWeekly: "low" | "medium" | "flexible"
  onboardingCompleted: boolean
  onboardingCompletedAt?: string | null
}

export interface ChatQuota {
  used: number
  max: number
  month: string
}

export interface ProfileDiff {
  dietary?: string[] | null
  dislikes?: string[] | null
  cuisines?: string[] | null
  mealsPerWeek?: number | null
  portions?: number | null
  maxTimeMinutes?: number | null
  budgetWeekly?: "low" | "medium" | "flexible" | null
}

export interface ChatMessage {
  from: "chef" | "user"
  text: string
}

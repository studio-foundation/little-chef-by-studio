export interface RunCreated {
  run_id: string;
  status: string;
  stream_url: string;
}

export interface WeeklyPlanInput {
  profiles: Record<string, unknown>;
  week_constraints: {
    max_prep_time_minutes: number;
    servings: number;
    avoid_repeat_from_history: boolean;
    meal_count: number;
  };
  userId: string;
}

// Placeholder : remplacé par les vraies données d'onboarding (STU-onboarding)
const PLACEHOLDER_PROFILE: Omit<WeeklyPlanInput, 'userId'> = {
  profiles: {
    person_1: {
      name: 'Alex',
      preferences: ['cuisine méditerranéenne', 'cuisine asiatique'],
      dietary_constraints: ['végétarien'],
      sensory_profile: {
        spice_tolerance: 'medium',
        texture_aversions: [],
        sauce_preference: 'light',
      },
    },
  },
  week_constraints: {
    max_prep_time_minutes: 45,
    servings: 2,
    avoid_repeat_from_history: true,
    meal_count: 5,
  },
};

export async function startWeeklyPlan(userId: string): Promise<RunCreated> {
  const res = await fetch('/api/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pipeline: 'meal-planner-weekly',
      input: { ...PLACEHOLDER_PROFILE, userId },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Studio API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<RunCreated>;
}

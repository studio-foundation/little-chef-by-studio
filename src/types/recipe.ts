export interface Ingredient {
  name: string;
  quantity: string;
  unit?: string;
  aisle?: string;
}

export interface RecipeStep {
  order: number;
  instruction: string;
  durationMinutes?: number;
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  cuisine?: string;
  timeMinutes?: number;
  portions?: number;
  calories?: number;
  emoji?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  notes?: string[];
  createdAt: string;
}

export interface WeeklyPlanRecipe {
  position: number;
  recipe: Recipe;
}

export interface WeeklyPlan {
  id: string;
  userId: string;
  weekStart: string;
  createdAt: string;
  recipes: WeeklyPlanRecipe[];
  groceryList?: GroceryList;
}

export interface GroceryList {
  id: string;
  planId: string;
  items: GroceryItem[];
}

export interface GroceryItem {
  name: string;
  quantity: string;
  unit?: string;
  aisle?: string;
  checked: boolean;
}

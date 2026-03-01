export interface Recipe {
  name: string;
  time: string;
  kcal: string;
  tags: string[];
  emoji: string;
  color: string;   // light background color, e.g. "#FFF3E0"
  accent: string;  // vivid accent color, e.g. "#FF9800"
  desc: string;
  // Extended fields for /recipes page
  id?: number;
  description?: string;
  portions?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
  ingredients?: { qty: string; name: string }[];
  steps?: string[];
}

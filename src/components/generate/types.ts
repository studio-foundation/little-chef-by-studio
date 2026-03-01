export interface Recipe {
  name: string;
  time: string;
  kcal: string;
  tags: string[];
  emoji: string;
  color: string;   // light background color, e.g. "#FFF3E0"
  accent: string;  // vivid accent color, e.g. "#FF9800"
  desc: string;
}

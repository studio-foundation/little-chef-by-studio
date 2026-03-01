import type { Recipe } from "./types";

export const SAMPLE_RECIPES: Recipe[] = [
  {
    name: "Bol de quinoa aux légumes rôtis",
    time: "25 min",
    kcal: "480 kcal",
    tags: ["Végétarien", "Facile"],
    emoji: "🥗",
    color: "#E8F5E9",
    accent: "#4CAF50",
    desc: "Quinoa, courge butternut, poivrons, tahini citronné",
  },
  {
    name: "Saumon teriyaki au riz jasmin",
    time: "20 min",
    kcal: "560 kcal",
    tags: ["Sans gluten", "Rapide"],
    emoji: "🐟",
    color: "#FFF3E0",
    accent: "#FF9800",
    desc: "Filet de saumon, riz jasmin, brocoli, sauce teriyaki maison",
  },
  {
    name: "Pasta e fagioli",
    time: "35 min",
    kcal: "420 kcal",
    tags: ["Végétarien", "Confort"],
    emoji: "🍝",
    color: "#FCE4EC",
    accent: "#E91E63",
    desc: "Haricots borlotti, petites pâtes, tomates, romarin",
  },
  {
    name: "Poulet miso aux champignons",
    time: "30 min",
    kcal: "510 kcal",
    tags: ["Protéines", "Umami"],
    emoji: "🍗",
    color: "#F3E5F5",
    accent: "#9C27B0",
    desc: "Cuisse de poulet, shiitakes, pâte miso blanche, gingembre",
  },
  {
    name: "Tacos de lentilles épicées",
    time: "25 min",
    kcal: "390 kcal",
    tags: ["Végétalien", "Épicé"],
    emoji: "🌮",
    color: "#FFF8E1",
    accent: "#FFC107",
    desc: "Lentilles beluga, avocat, salsa verde, crème de cajou",
  },
];

export const GENERATION_MESSAGES = [
  "On analyse tes préférences…",
  "Première recette en préparation…",
  "On équilibre les nutriments…",
  "Troisième recette trouvée…",
  "Presque là…",
  "Dernière touche…",
  "Ta semaine est prête ✨",
];

export interface RecipeExample {
  id: string
  slug: string
  label: string
  input: {
    dish_name: string
    userId: string
    constraints: string[]
  }
}

const USER_ID = 'cmmrunf9l0000cpijlrn58jpw'

export const EXAMPLES: RecipeExample[] = [
  {
    id: '01',
    slug: 'pad-thai-vegan',
    label: 'Pad Thai vegan',
    input: {
      dish_name: 'Pad Thai vegan',
      userId: USER_ID,
      constraints: ['sans produits animaux', 'temps de préparation max 30 minutes', 'pour 4 personnes'],
    },
  },
  {
    id: '02',
    slug: 'risotto-champignons',
    label: 'Risotto aux champignons',
    input: {
      dish_name: 'Risotto aux champignons sauvages',
      userId: USER_ID,
      constraints: ['végétarien', 'pour 4 personnes', 'ingrédients accessibles en épicerie standard'],
    },
  },
  {
    id: '03',
    slug: 'tacos-tofu-coreens',
    label: 'Tacos tofu coréens',
    input: {
      dish_name: 'Tacos au tofu coréens',
      userId: USER_ID,
      constraints: ['sans produits animaux', 'pour 6 personnes', 'épicé niveau moyen'],
    },
  },
  {
    id: '04',
    slug: 'soupe-miso-hivernale',
    label: 'Soupe miso hivernale',
    input: {
      dish_name: "Soupe miso enrichie pour l'hiver",
      userId: USER_ID,
      constraints: ['sans gluten', 'pour 2 personnes', 'réconfortant', "peu d'ingrédients"],
    },
  },
  {
    id: '05',
    slug: 'curry-vert-thai-poulet',
    label: 'Curry vert thaï poulet',
    input: {
      dish_name: 'Curry vert thaï au poulet',
      userId: USER_ID,
      constraints: ['temps de préparation max 30 minutes', 'pour 4 personnes', 'niveau intermédiaire'],
    },
  },
  {
    id: '06',
    slug: 'lasagne-vegetarienne',
    label: 'Lasagne végétarienne',
    input: {
      dish_name: 'Lasagne végétarienne maison',
      userId: USER_ID,
      constraints: ['végétarien', 'pour 6 personnes', "peut se préparer à l'avance"],
    },
  },
  {
    id: '07',
    slug: 'bibimbap-sans-gluten',
    label: 'Bibimbap sans gluten',
    input: {
      dish_name: 'Bibimbap',
      userId: USER_ID,
      constraints: ['sans gluten', 'pour 2 personnes', 'budget raisonnable'],
    },
  },
  {
    id: '08',
    slug: 'salade-nicoise',
    label: 'Salade niçoise',
    input: {
      dish_name: 'Salade niçoise classique',
      userId: USER_ID,
      constraints: ['sans cuisson', 'pour 4 personnes', 'recette classique fidèle'],
    },
  },
  {
    id: '09',
    slug: 'dahl-lentilles-corail',
    label: 'Dahl de lentilles corail',
    input: {
      dish_name: 'Dahl de lentilles corail',
      userId: USER_ID,
      constraints: ['sans produits animaux', 'sans gluten', 'temps de préparation max 30 minutes', 'pour 4 personnes'],
    },
  },
  {
    id: '10',
    slug: 'boeuf-bourguignon',
    label: 'Boeuf bourguignon',
    input: {
      dish_name: 'Boeuf bourguignon traditionnel',
      userId: USER_ID,
      constraints: ['pour 6 personnes', 'recette traditionnelle', 'mijotage long accepté'],
    },
  },
]

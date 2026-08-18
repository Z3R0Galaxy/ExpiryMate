import type { FoodCategory } from '../hooks/useItems'

// Slice 6 nice-to-have: guesses a category from the item's name so the
// user doesn't have to manually pick one from the dropdown every time,
// while remaining fully overridable (see AddItemForm — the guess stops
// once the user touches the category dropdown themselves). Deliberately a
// plain keyword lookup, not a network/LLM call — see decisions.md,
// "Auto-category suggestion from item name": a heuristic this simple
// doesn't need the cost, latency, or new failure mode of a real AI call,
// and it's honestly a heuristic, not "AI," which matters for how this is
// framed in Part B.

interface CategoryRule {
  category: FoodCategory
  keywords: string[]
}

// Order matters — checked top to bottom, first match wins. Frozen is
// checked first since a frozen version of any other category (frozen
// chicken, frozen peas, frozen bread) should read as Frozen, not its base
// category.
const RULES: CategoryRule[] = [
  {
    category: 'Frozen',
    keywords: ['frozen', 'ice cream', 'icecream', 'ice-cream', 'popsicle', 'ice block'],
  },
  {
    category: 'Eggs',
    keywords: ['egg', 'eggs'],
  },
  {
    category: 'Dairy',
    keywords: ['milk', 'cheese', 'yoghurt', 'yogurt', 'butter', 'cream', 'custard', 'margarine'],
  },
  {
    category: 'Meat',
    keywords: ['chicken', 'beef', 'pork', 'lamb', 'mince', 'sausage', 'bacon', 'ham', 'turkey', 'steak', 'meatball', 'salami'],
  },
  {
    category: 'Seafood',
    keywords: ['fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'crab', 'lobster', 'oyster', 'mussel', 'squid', 'seafood'],
  },
  {
    category: 'Bakery',
    keywords: ['bread', 'bun', 'bagel', 'croissant', 'muffin', 'cake', 'pastry', 'roll', 'baguette', 'donut', 'doughnut'],
  },
  {
    category: 'Beverages',
    keywords: ['juice', 'soda', 'water', 'milkshake', 'drink', 'cola', 'beer', 'wine', 'coffee', 'tea', 'lemonade', 'cordial'],
  },
  {
    category: 'Condiments',
    keywords: ['sauce', 'ketchup', 'mustard', 'mayo', 'mayonnaise', 'dressing', 'jam', 'honey', 'syrup', 'oil', 'vinegar', 'salsa', 'pesto'],
  },
  {
    category: 'Snacks',
    keywords: ['chips', 'crisps', 'crackers', 'nuts', 'popcorn', 'pretzel', 'biscuit', 'cookie'],
  },
  {
    category: 'Leftovers',
    keywords: ['leftover', 'leftovers', 'takeaway', 'takeout', 'soup', 'stew', 'curry', 'casserole', 'lasagne', 'lasagna'],
  },
  {
    category: 'Produce',
    keywords: [
      'apple', 'banana', 'carrot', 'lettuce', 'tomato', 'potato', 'onion', 'spinach', 'broccoli',
      'fruit', 'vegetable', 'veg', 'berry', 'grape', 'orange', 'avocado', 'cucumber', 'capsicum',
      'pepper', 'mushroom', 'zucchini', 'pumpkin', 'garlic', 'lemon', 'lime', 'mango', 'pear', 'peach',
    ],
  },
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Pure, synchronous, no network. Matches whole words (case-insensitive)
 * against a curated keyword list; multi-word keywords (e.g. "ice cream")
 * fall back to a plain substring check since a word-boundary regex
 * doesn't apply cleanly to a phrase. Returns null rather than a fallback
 * category when nothing matches, so the caller can leave the current
 * selection alone instead of guessing wrong.
 */
export function guessCategory(name: string): FoodCategory | null {
  const trimmed = name.trim().toLowerCase()
  if (!trimmed) return null

  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      if (keyword.includes(' ')) {
        if (trimmed.includes(keyword)) return rule.category
      } else if (new RegExp(`\\b${escapeRegExp(keyword)}\\b`).test(trimmed)) {
        return rule.category
      }
    }
  }

  return null
}

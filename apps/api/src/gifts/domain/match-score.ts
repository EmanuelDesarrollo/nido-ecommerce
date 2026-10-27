import { Category, Clues, ONE_SIZE } from '@nido/shared';

export interface ScorableProduct {
  category: Category;
  tags: string[];
  priceCop: number;
  variants: { size: string; stock: number }[];
}

export const BASE_SCORE_WITHOUT_CLUES = 50;
const FAVORITE_POINTS = 50;
const SECOND_FAVORITE_POINTS = 30;
const STYLE_POINTS = 25;
const PRICE_BAND_POINTS = 25;

/**
 * Corazonada %: how well a product fits the recipient's clues and the budget.
 * Returns null when the product must be excluded.
 */
export function matchScore(product: ScorableProduct, clues: Clues | null, budgetCop: number): number | null {
  if (product.priceCop > budgetCop) return null;
  if (!product.variants.some((v) => v.stock > 0)) return null;

  const inPriceBand = product.priceCop >= budgetCop * 0.6 ? PRICE_BAND_POINTS : 0;
  if (!clues) return BASE_SCORE_WITHOUT_CLUES + inPriceBand;

  if (clues.avoidCategory === product.category) return null;
  const size = product.category === 'moda' ? clues.size : ONE_SIZE;
  if (!product.variants.some((v) => v.size === size && v.stock > 0)) return null;

  let score = inPriceBand;
  const [first, second] = clues.favoriteCategories;
  if (product.category === first) score += FAVORITE_POINTS;
  else if (product.category === second) score += SECOND_FAVORITE_POINTS;
  if (product.tags.includes(clues.style)) score += STYLE_POINTS;
  return Math.min(score, 100);
}

/** Scores, drops excluded products and sorts best first (ties: price closest to the budget). */
export function rankProducts<P extends ScorableProduct>(
  products: P[],
  clues: Clues | null,
  budgetCop: number,
): (P & { score: number })[] {
  return products
    .flatMap((p) => {
      const score = matchScore(p, clues, budgetCop);
      return score === null ? [] : [{ ...p, score }];
    })
    .sort((a, b) => b.score - a.score || Math.abs(budgetCop - a.priceCop) - Math.abs(budgetCop - b.priceCop));
}

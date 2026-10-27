import { Clues } from '@nido/shared';
import { BASE_SCORE_WITHOUT_CLUES, matchScore, rankProducts, ScorableProduct } from './match-score';

const BUDGET = 200_000;
const clues: Clues = { favoriteCategories: ['moda', 'belleza'], style: 'minimal', size: 'M', avoidCategory: 'hogar' };

const dress = (overrides: Partial<ScorableProduct> = {}): ScorableProduct => ({
  category: 'moda',
  tags: ['dresses', 'minimal'],
  priceCop: 150_000,
  variants: [
    { size: 'S', stock: 2 },
    { size: 'M', stock: 3 },
  ],
  ...overrides,
});
const oneSize = (category: ScorableProduct['category'], overrides: Partial<ScorableProduct> = {}): ScorableProduct => ({
  category,
  tags: [],
  priceCop: 50_000,
  variants: [{ size: 'UNICA', stock: 10 }],
  ...overrides,
});

describe('matchScore', () => {
  it('gives 100 to a favorite, matching style, in the price band', () => {
    expect(matchScore(dress(), clues, BUDGET)).toBe(100);
  });

  it('scores the second favorite lower than the first', () => {
    expect(matchScore(oneSize('belleza'), clues, BUDGET)).toBe(30);
    expect(matchScore(dress({ tags: [], priceCop: 50_000 }), clues, BUDGET)).toBe(50);
  });

  describe('excludes', () => {
    it('products over budget', () => {
      expect(matchScore(dress({ priceCop: BUDGET + 1 }), clues, BUDGET)).toBeNull();
    });
    it('the avoided category', () => {
      expect(matchScore(oneSize('hogar'), clues, BUDGET)).toBeNull();
    });
    it('fashion without stock in the clue size', () => {
      expect(matchScore(dress({ variants: [{ size: 'M', stock: 0 }, { size: 'L', stock: 4 }] }), clues, BUDGET)).toBeNull();
    });
    it('products without any stock, even without clues', () => {
      expect(matchScore(oneSize('tecnologia', { variants: [{ size: 'UNICA', stock: 0 }] }), null, BUDGET)).toBeNull();
    });
  });

  it('without clues uses a base score plus the price band', () => {
    expect(matchScore(oneSize('hogar', { priceCop: 50_000 }), null, BUDGET)).toBe(BASE_SCORE_WITHOUT_CLUES);
    expect(matchScore(oneSize('hogar', { priceCop: 180_000 }), null, BUDGET)).toBe(BASE_SCORE_WITHOUT_CLUES + 25);
  });
});

describe('rankProducts', () => {
  it('drops excluded products and sorts by score, then by price closest to the budget', () => {
    const products = [
      { id: 'cheap-tech', ...oneSize('tecnologia', { priceCop: 20_000 }) },
      { id: 'decor', ...oneSize('hogar') },
      { id: 'dress', ...dress() },
      { id: 'pricier-tech', ...oneSize('tecnologia', { priceCop: 100_000 }) },
      { id: 'lipstick', ...oneSize('belleza') },
    ];
    expect(rankProducts(products, clues, BUDGET).map((p) => p.id)).toEqual([
      'dress',
      'lipstick',
      'pricier-tech',
      'cheap-tech',
    ]);
  });
});

export const CATEGORIES = ['moda', 'belleza', 'tecnologia', 'hogar'] as const;
export type Category = (typeof CATEGORIES)[number];

export const STYLES = ['clasico', 'atrevido', 'minimal', 'comodo'] as const;
export type Style = (typeof STYLES)[number];

export const SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;
export type Size = (typeof SIZES)[number];

/** Size used by every non-fashion product. */
export const ONE_SIZE = 'UNICA';

export type Clues = {
  /** One or two categories, the first one is the favorite. */
  favoriteCategories: Category[];
  style: Style;
  size: Size;
  /** null means "Nada, sorpréndeme". */
  avoidCategory: Category | null;
};

export const CATEGORY_LABELS: Record<Category, string> = {
  moda: 'Moda',
  belleza: 'Belleza',
  tecnologia: 'Tecnología',
  hogar: 'Hogar',
};

export const STYLE_LABELS: Record<Style, string> = {
  clasico: 'Clásico',
  atrevido: 'Atrevido',
  minimal: 'Minimal',
  comodo: 'Cómodo',
};

export const CLUE_QUESTIONS = {
  favoriteCategories: { title: '¿Qué te emociona más?', hint: 'Elige hasta 2', max: 2 },
  style: { title: 'Tu estilo' },
  size: { title: 'Tu talla de ropa' },
  avoidCategory: { title: '¿Algo que definitivamente NO quieras?', noneLabel: 'Nada, sorpréndeme' },
} as const;

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

export function isCategory(value: unknown): value is Category {
  return isOneOf(CATEGORIES, value);
}

/** Runtime guard for clues stored as JSON. */
export function isClues(value: unknown): value is Clues {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.favoriteCategories) &&
    v.favoriteCategories.every(isCategory) &&
    isOneOf(STYLES, v.style) &&
    isOneOf(SIZES, v.size) &&
    (v.avoidCategory === null || isCategory(v.avoidCategory))
  );
}

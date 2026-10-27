import { Category, ONE_SIZE, SIZES, STYLES } from '@nido/shared';
import { PrismaClient } from '@prisma/client';
import fallbackProducts from './fallback-products.json';

const prisma = new PrismaClient();

interface DummyProduct {
  id: number;
  title: string;
  price: number;
  tags: string[];
  thumbnail: string;
  category: string;
}

const CATEGORY_MAP: Record<string, Category> = {
  'womens-dresses': 'moda',
  tops: 'moda',
  'mens-shirts': 'moda',
  'womens-shoes': 'moda',
  beauty: 'belleza',
  fragrances: 'belleza',
  smartphones: 'tecnologia',
  laptops: 'tecnologia',
  'mobile-accessories': 'tecnologia',
  'home-decoration': 'hogar',
  'kitchen-accessories': 'hogar',
};

const USERS = [
  { id: 'andres', name: 'Andrés' },
  { id: 'laura', name: 'Laura' },
];

async function fetchCatalog(): Promise<DummyProduct[]> {
  try {
    const lists = await Promise.all(
      Object.keys(CATEGORY_MAP).map(async (category) => {
        const res = await fetch(
          `https://dummyjson.com/products/category/${category}?limit=0&select=id,title,price,tags,thumbnail,category`,
          { signal: AbortSignal.timeout(8000) },
        );
        if (!res.ok) throw new Error(`DummyJSON ${category}: HTTP ${res.status}`);
        const body = (await res.json()) as { products: DummyProduct[] };
        return body.products;
      }),
    );
    return lists.flat();
  } catch (error) {
    console.warn('DummyJSON unavailable, using fallback-products.json:', error);
    return fallbackProducts as DummyProduct[];
  }
}

/** Deterministic pseudo-random 0..5 so re-running the seed gives the same stock. */
function stockFor(externalId: number, size: string): number {
  return (externalId * 7 + size.charCodeAt(0) * 3 + size.length) % 6;
}

async function seedCatalog(): Promise<void> {
  const products = await fetchCatalog();
  for (const p of products) {
    const category = CATEGORY_MAP[p.category];
    if (!category) continue;
    // DummyJSON has no style data, so each product gets one style tag deterministically.
    const tags = [...p.tags, STYLES[p.id % STYLES.length]];
    const data = {
      title: p.title,
      category,
      tags,
      priceCop: Math.round((p.price * 4000) / 1000) * 1000,
      imageUrl: p.thumbnail,
    };
    const product = await prisma.product.upsert({
      where: { externalId: p.id },
      update: data,
      create: { externalId: p.id, ...data },
    });
    const sizes: string[] = category === 'moda' ? [...SIZES] : [ONE_SIZE];
    for (const size of sizes) {
      await prisma.productVariant.upsert({
        where: { productId_size: { productId: product.id, size } },
        update: {},
        create: { productId: product.id, size, stock: category === 'moda' ? stockFor(p.id, size) : 10 },
      });
    }
  }
  console.log(`Seeded ${products.length} products`);
}

async function main(): Promise<void> {
  for (const user of USERS) {
    const data = { name: user.name, avatarUrl: `https://i.pravatar.cc/150?u=${user.id}` };
    await prisma.user.upsert({ where: { id: user.id }, update: data, create: { id: user.id, ...data } });
  }
  // The seed runs on every deploy: only load the catalog once so stock sold in the demo is kept.
  if ((await prisma.product.count()) > 0) {
    console.log('Catalog already seeded, skipping products');
    return;
  }
  await seedCatalog();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

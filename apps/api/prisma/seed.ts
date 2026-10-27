import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 0: only the two fixed users. Products come in Phase 1.
async function main(): Promise<void> {
  const users = [
    { id: 'andres', name: 'Andrés' },
    { id: 'laura', name: 'Laura' },
  ];
  for (const user of users) {
    const data = { name: user.name, avatarUrl: `https://i.pravatar.cc/150?u=${user.id}` };
    await prisma.user.upsert({ where: { id: user.id }, update: data, create: { id: user.id, ...data } });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

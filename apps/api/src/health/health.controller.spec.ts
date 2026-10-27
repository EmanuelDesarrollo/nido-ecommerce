import { HEALTH_SERVICE_NAME } from '@nido/shared';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok when the database answers', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([1]) } as unknown as PrismaService;
    const result = await new HealthController(prisma).check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe(HEALTH_SERVICE_NAME);
  });
});

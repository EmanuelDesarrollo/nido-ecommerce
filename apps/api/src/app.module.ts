import { Module } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module';
import { GiftsModule } from './gifts/gifts.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, UsersModule, CatalogModule, GiftsModule],
  controllers: [HealthController],
})
export class AppModule {}

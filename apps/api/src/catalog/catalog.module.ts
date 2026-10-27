import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [UsersModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}

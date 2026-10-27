import { Module } from '@nestjs/common';
import { UserGuard } from '../common/user.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserGuard],
  exports: [UsersService, UserGuard],
})
export class UsersModule {}

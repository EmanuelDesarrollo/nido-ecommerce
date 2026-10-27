import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { MeDto, UserDto } from '@nido/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { UserGuard } from '../common/user.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Public: feeds the "Entrar como…" screen. */
  @Get()
  findAll(): Promise<UserDto[]> {
    return this.users.findAll();
  }

  @Get('me')
  @UseGuards(UserGuard)
  async me(@CurrentUser() user: UserDto): Promise<MeDto> {
    const me = await this.users.findMe(user.id);
    if (!me) throw new NotFoundException();
    return me;
  }
}

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { USER_HEADER } from '@nido/shared';
import { UsersService } from '../users/users.service';
import { AuthedRequest } from './authed-request';

/**
 * Identity for the demo: the x-user-id header must match a seeded user.
 * In production this would be real auth (JWT or session).
 */
@Injectable()
export class UserGuard implements CanActivate {
  constructor(private readonly users: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const userId = request.header(USER_HEADER);
    const user = userId ? await this.users.findById(userId) : null;
    if (!user) throw new UnauthorizedException('Unknown user');
    request.user = user;
    return true;
  }
}

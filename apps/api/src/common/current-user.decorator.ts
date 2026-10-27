import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDto } from '@nido/shared';
import { AuthedRequest } from './authed-request';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserDto => context.switchToHttp().getRequest<AuthedRequest>().user,
);

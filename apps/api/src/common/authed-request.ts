import { UserDto } from '@nido/shared';
import { Request } from 'express';

export interface AuthedRequest extends Request {
  user: UserDto;
}

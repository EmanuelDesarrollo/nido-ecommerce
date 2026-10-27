import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainError, DomainErrorKind } from '../gifts/domain/errors';

const STATUS_BY_KIND: Record<DomainErrorKind, HttpStatus> = {
  not_found: HttpStatus.NOT_FOUND,
  forbidden: HttpStatus.FORBIDDEN,
  conflict: HttpStatus.CONFLICT,
  unprocessable: HttpStatus.UNPROCESSABLE_ENTITY,
};

/** Maps domain errors to HTTP (e.g. an invalid state transition is a 409). */
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const statusCode = STATUS_BY_KIND[error.kind];
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ statusCode, message: error.message, error: error.constructor.name });
  }
}

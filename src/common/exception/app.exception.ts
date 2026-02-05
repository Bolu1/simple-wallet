import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';
import { ResponseDto } from '../dtos/response.dto';

@Catch(HttpException)
export class AppException
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  catch(exception, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse: ResponseDto = {
      status: false,
      code: statusCode,
      message: exceptionResponse || (exceptionResponse).message,
    };

    if (statusCode == HttpStatus.BAD_REQUEST) {
      errorResponse.errors =
        typeof exceptionResponse.message == 'string' ||
        typeof exceptionResponse === 'string'
          ? [exceptionResponse.message || exceptionResponse]
          : exceptionResponse.message || exceptionResponse;

      errorResponse.message = exceptionResponse.error;
    }
    if (statusCode == HttpStatus.UNAUTHORIZED) {
      errorResponse.errors =
        typeof exceptionResponse.message == 'string' ||
        typeof exceptionResponse === 'string'
          ? [exceptionResponse.message || exceptionResponse]
          : exceptionResponse.message || exceptionResponse;

      errorResponse.message = exceptionResponse.error;
    }
    if (statusCode == HttpStatus.FORBIDDEN) {
      errorResponse.errors =
        typeof exceptionResponse.message == 'string' ||
        typeof exceptionResponse === 'string'
          ? [exceptionResponse.message || exceptionResponse]
          : exceptionResponse.message || exceptionResponse;

      errorResponse.message = exceptionResponse.error;
    }
    if (statusCode == HttpStatus.NOT_FOUND) {
      errorResponse.errors =
        typeof exceptionResponse.message == 'string' ||
        typeof exceptionResponse === 'string'
          ? [exceptionResponse.message || exceptionResponse]
          : exceptionResponse.message || exceptionResponse;

      errorResponse.message = exceptionResponse.error;
    }
    if (statusCode == HttpStatus.UNPROCESSABLE_ENTITY) {
      errorResponse.errors =
        typeof exceptionResponse.message == 'string' ||
        typeof exceptionResponse === 'string'
          ? [exceptionResponse.message || exceptionResponse]
          : exceptionResponse.message || exceptionResponse;

      errorResponse.message = exceptionResponse.error;
    }
    return response.status(statusCode).json(errorResponse);
  }
}

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly winstonLogger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const ip = request.ip;

    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
      }
    } else {
      message = 'Internal server error';
      error = 'InternalServerError';
    }

    // Log the error
    this.winstonLogger.error('Uncaught Exception', {
      timestamp,
      path,
      method,
      ip,
      status,
      error,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
      userAgent: request.get('User-Agent'),
      userId: request.user?.id,
      isAuthenticated: !!request.user,
    });

    // Prepare error response
    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp,
      path,
      method,
      error,
      message,
    };

    // Don't send stack trace in production
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      errorResponse['stack'] = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}
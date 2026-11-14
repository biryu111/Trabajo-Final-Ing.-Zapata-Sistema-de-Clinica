import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';
    let code = 'INTERNAL_SERVER_ERROR';

    const extraFields: Record<string, any> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      if (typeof res === 'object' && res !== null) {
        if (typeof res.error === 'object' && res.error !== null) {
          code = res.error.code || exception.name;
          message = res.error.message || exception.message;
          Object.assign(extraFields, res.error);
        } else {
          message = res.message || exception.message;
          code = res.error || exception.name;
        }
        if (res.permanente !== undefined) extraFields.permanente = res.permanente;
        if (res.retryAfterSeconds !== undefined) extraFields.retryAfterSeconds = res.retryAfterSeconds;
      } else {
        message = res || exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      error: {
        code,
        message,
        statusCode: status,
        timestamp: new Date().toISOString(),
        ...extraFields,
      },
    });
  }
}

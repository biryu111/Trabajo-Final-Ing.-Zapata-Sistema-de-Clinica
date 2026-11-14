import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RequireMfaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'];

    if (!user) {
      return true; // Si aún no está autenticado, AuthGuard se encarga
    }

    const path = request.path || request.url;

    // Rutas exentas de requerir 2FA previo para permitir configurarlo o salir
    const isExempt =
      path.startsWith('/auth/2fa') ||
      path.startsWith('/api/auth/2fa') ||
      path.startsWith('/usuarios/perfil') ||
      path.startsWith('/api/usuarios/perfil') ||
      path.startsWith('/auth/logout') ||
      path.startsWith('/api/auth/logout');

    if (isExempt) {
      return true;
    }

    // Obligatorio para rol ADMIN
    if (user.rol === 'ADMIN' && !user.twoFactorEnabled) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: {
            code: 'DOBLE_FACTOR_REQUERIDO',
            message:
              'Se requiere activar la autenticación de dos factores (2FA) para acceder al panel administrativo.',
          },
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}

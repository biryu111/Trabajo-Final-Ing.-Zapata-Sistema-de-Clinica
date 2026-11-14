import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de acceso no proporcionado');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-key-clinica-2026',
      });

      // Si el token tiene scope '2fa', solo es un token temporal de desafío, no de acceso completo
      if (payload.scope === '2fa') {
        throw new UnauthorizedException('Token temporal de verificación de dos factores');
      }

      const userId = payload.sub;
      if (!userId) {
        throw new UnauthorizedException('Token inválido');
      }

      // 1. Intentar leer desde caché Redis (TTL 60s)
      const cacheKey = `usuario:auth:${userId}`;
      let user: any = null;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        try {
          user = JSON.parse(cached);
        } catch {
          user = null;
        }
      }

      // 2. Si no está en caché, consultar PostgreSQL
      if (!user) {
        user = await this.prisma.usuario.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            nombre: true,
            rol: true,
            activo: true,
            tokenVersion: true,
            twoFactorEnabled: true,
            permanentlyLocked: true,
            lockedUntil: true,
            eliminadoEn: true,
          },
        });

        if (user) {
          // Guardar en caché Redis por 60 segundos
          await this.redis.set(cacheKey, JSON.stringify(user), 60);
        }
      }

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      if (!user.activo || user.eliminadoEn) {
        throw new UnauthorizedException('Cuenta inactiva o deshabilitada');
      }

      if (user.permanentlyLocked) {
        throw new UnauthorizedException('Cuenta bloqueada permanentemente');
      }

      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        throw new UnauthorizedException('Cuenta bloqueada temporalmente');
      }

      // Validación de tokenVersion para invalidación inmediata de sesiones revocadas
      if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
        throw new UnauthorizedException('Sesión revocada o desactualizada');
      }

      request['user'] = user;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Token de acceso inválido o expirado');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogParams {
  actorId?: string;
  accion: string;
  entidad?: string;
  entidadId?: string;
  detalle?: Record<string, any>;
  ip?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un evento de auditoría de forma segura y tolerante a fallos.
   * Si la inserción en base de datos falla, se captura y reporta en log sin romper el flujo principal.
   * Sanitiza cualquier campo sensible para evitar guardar contraseñas o secretos.
   */
  async log(params: AuditLogParams): Promise<void> {
    try {
      const sanitizedDetalle = this.sanitizeDetalle(params.detalle);

      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          accion: params.accion,
          entidad: params.entidad,
          entidadId: params.entidadId,
          detalle: sanitizedDetalle,
          ip: params.ip,
        },
      });
    } catch (err: any) {
      this.logger.error(`Error al registrar AuditLog [${params.accion}]: ${err.message}`, err.stack);
    }
  }

  private sanitizeDetalle(detalle?: Record<string, any>): Record<string, any> | undefined {
    if (!detalle) return undefined;
    const sanitized = { ...detalle };

    const sensitiveKeys = ['password', 'contrasena', 'secret', 'token', 'refreshToken', 'challengeToken', 'twoFactorSecret', 'twoFactorSecretEnc'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

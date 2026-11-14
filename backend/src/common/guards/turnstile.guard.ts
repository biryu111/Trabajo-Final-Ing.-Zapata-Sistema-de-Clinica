import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { getClientIp } from '../utils/ip.util';

@Injectable()
export class TurnstileGuard implements CanActivate {
  private readonly logger = new Logger(TurnstileGuard.name);
  private static readonly VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    const isProduction = process.env.NODE_ENV === 'production';

    // En desarrollo/testing sin llave definida, se permite el paso
    if (!secretKey) {
      if (!isProduction) {
        return true;
      }
      throw new BadRequestException('Configuración de Turnstile faltante en el servidor de producción.');
    }

    const token = request.body?.turnstileToken;
    if (!token) {
      throw new BadRequestException('Debe completar la verificación de seguridad (Cloudflare Turnstile).');
    }

    // Llave oficial de pruebas de Cloudflare ("Always Passes")
    if (token === 'XXXX.DUMMY.TOKEN.XXXX' || secretKey.startsWith('1x0000000000000000000000000000000AA')) {
      return true;
    }

    try {
      const remoteIp = getClientIp(request);
      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token);
      if (remoteIp) {
        formData.append('remoteip', remoteIp);
      }

      const res = await fetch(TurnstileGuard.VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      const outcome: any = await res.json();
      if (!outcome.success) {
        this.logger.warn(`Verificación Turnstile fallida para IP ${remoteIp}: ${JSON.stringify(outcome['error-codes'])}`);
        throw new BadRequestException('Verificación de seguridad inválida o expirada. Por favor intente nuevamente.');
      }

      return true;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Error al conectar con Cloudflare Turnstile: ${err.message}`);
      throw new BadRequestException('No se pudo verificar el desafío de seguridad.');
    }
  }
}

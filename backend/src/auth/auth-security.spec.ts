import { ExecutionContext, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CryptoUtil } from '../common/utils/crypto.util';
import { TurnstileGuard } from '../common/guards/turnstile.guard';
import { RequireMfaGuard } from '../common/guards/require-mfa.guard';
import { AuthService } from './auth.service';
import { authenticator } from 'otplib';

describe('Fase 1 Security Unit Tests', () => {
  beforeAll(() => {
    process.env.TOTP_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  describe('CryptoUtil (AES-256-GCM)', () => {
    it('debe cifrar y descifrar un secreto correctamente', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const encrypted = CryptoUtil.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toEqual(plaintext);
      expect(encrypted.split(':')).toHaveLength(3); // iv:tag:ciphertext

      const decrypted = CryptoUtil.decrypt(encrypted);
      expect(decrypted).toEqual(plaintext);
    });

    it('debe fallar si el texto cifrado es manipulado', () => {
      const encrypted = CryptoUtil.encrypt('secreto123');
      const parts = encrypted.split(':');
      const tampered = `${parts[0]}:${parts[1]}:badciphertext`;

      expect(() => CryptoUtil.decrypt(tampered)).toThrow();
    });
  });

  describe('TurnstileGuard', () => {
    let guard: TurnstileGuard;

    beforeEach(() => {
      guard = new TurnstileGuard();
    });

    const createMockContext = (body: any, ip: string = '127.0.0.1'): ExecutionContext => {
      const req = {
        body,
        headers: { 'x-forwarded-for': ip },
        ip,
      };
      return {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
      } as any;
    };

    it('debe rechazar con 400 si falta el turnstileToken en el body', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'real-secret-key';
      process.env.NODE_ENV = 'production';

      const ctx = createMockContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
    });

    it('debe aceptar el token de prueba "XXXX.DUMMY.TOKEN.XXXX"', async () => {
      process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
      const ctx = createMockContext({ turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX' });
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('debe verificar con la API de Cloudflare si el token es real', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'secret-test-key';
      process.env.NODE_ENV = 'production';

      const globalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ success: true }),
      }) as any;

      const ctx = createMockContext({ turnstileToken: 'valid-cloudflare-token' });
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);

      global.fetch = globalFetch;
    });

    it('debe rechazar con 400 si la API de Cloudflare responde success: false', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'secret-test-key';
      process.env.NODE_ENV = 'production';

      const globalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
      }) as any;

      const ctx = createMockContext({ turnstileToken: 'invalid-cloudflare-token' });
      await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);

      global.fetch = globalFetch;
    });
  });

  describe('RequireMfaGuard', () => {
    let guard: RequireMfaGuard;

    beforeEach(() => {
      guard = new RequireMfaGuard();
    });

    const createMockContext = (user: any, path: string = '/admin/citas'): ExecutionContext => {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user, path }),
        }),
      } as any;
    };

    it('debe permitir acceso si el usuario es CLIENTE sin importar 2FA', () => {
      const ctx = createMockContext({ rol: 'CLIENTE', twoFactorEnabled: false });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('debe permitir acceso si el usuario es ADMIN con twoFactorEnabled: true', () => {
      const ctx = createMockContext({ rol: 'ADMIN', twoFactorEnabled: true });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('debe rechazar con 403 DOBLE_FACTOR_REQUERIDO si ADMIN tiene twoFactorEnabled: false', () => {
      const ctx = createMockContext({ rol: 'ADMIN', twoFactorEnabled: false });
      try {
        guard.canActivate(ctx);
        fail('Debería haber lanzado una excepción');
      } catch (err: any) {
        expect(err.getStatus()).toBe(403);
        expect(err.getResponse()).toEqual(
          expect.objectContaining({
            error: expect.objectContaining({ code: 'DOBLE_FACTOR_REQUERIDO' }),
          }),
        );
      }
    });
  });

  describe('Máquina de Estados de Bloqueo Escalonado (AuthService)', () => {
    let mockPrisma: any;
    let mockAudit: any;
    let authService: AuthService;

    beforeEach(() => {
      mockPrisma = {
        usuario: {
          update: jest.fn(),
        },
      };
      mockAudit = {
        log: jest.fn().mockResolvedValue(undefined),
      };

      authService = new AuthService(
        mockPrisma as any,
        { signAsync: jest.fn(), verifyAsync: jest.fn() } as any,
        { get: jest.fn(), set: jest.fn(), del: jest.fn() } as any,
        mockAudit as any,
      );
    });

    it('Etapa 0: Al alcanzar 10 intentos fallidos bloquea por 7 minutos y avanza a etapa 1', async () => {
      mockPrisma.usuario.update
        .mockResolvedValueOnce({ id: 'u1', failedAttempts: 10, lockStage: 0 })
        .mockResolvedValueOnce({});

      await authService.handleFailedLoginAttempt({ id: 'u1', failedAttempts: 9, lockStage: 0 });

      expect(mockPrisma.usuario.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'u1' },
        data: expect.objectContaining({
          failedAttempts: 0,
          lockStage: 1,
          lockedUntil: expect.any(Date),
          permanentlyLocked: false,
        }),
      });

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'CUENTA_BLOQUEADA_TEMPORAL',
          detalle: expect.objectContaining({ duracionMinutos: 7, etapa: 1 }),
        }),
      );
    });

    it('Etapa 1: Al alcanzar 3 intentos fallidos bloquea por 5 horas y avanza a etapa 2', async () => {
      mockPrisma.usuario.update
        .mockResolvedValueOnce({ id: 'u1', failedAttempts: 3, lockStage: 1 })
        .mockResolvedValueOnce({});

      await authService.handleFailedLoginAttempt({ id: 'u1', failedAttempts: 2, lockStage: 1 });

      expect(mockPrisma.usuario.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'u1' },
        data: expect.objectContaining({
          failedAttempts: 0,
          lockStage: 2,
          lockedUntil: expect.any(Date),
          permanentlyLocked: false,
        }),
      });

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'CUENTA_BLOQUEADA_TEMPORAL',
          detalle: expect.objectContaining({ duracionHoras: 5, etapa: 2 }),
        }),
      );
    });

    it('Etapa 2: Al fallar 1 intento bloquea permanentemente', async () => {
      mockPrisma.usuario.update
        .mockResolvedValueOnce({ id: 'u1', failedAttempts: 1, lockStage: 2 })
        .mockResolvedValueOnce({});

      await authService.handleFailedLoginAttempt({ id: 'u1', failedAttempts: 0, lockStage: 2 });

      expect(mockPrisma.usuario.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'u1' },
        data: expect.objectContaining({
          failedAttempts: 0,
          lockStage: 2,
          lockedUntil: null,
          permanentlyLocked: true,
        }),
      });

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'CUENTA_BLOQUEADA_PERMANENTE',
        }),
      );
    });
  });
});

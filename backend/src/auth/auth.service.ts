import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  Enable2FaDto,
  Disable2FaDto,
  RegenerateRecoveryCodesDto,
  Verify2FaDto,
} from './auth.dto';
import { validatePasswordPolicy } from '../common/utils/password.util';
import { CryptoUtil } from '../common/utils/crypto.util';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

const HTTP_STATUS_LOCKED = 423;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
  ) {
    authenticator.options = { window: 1 };
  }

  async register(dto: RegisterDto, ip?: string) {
    validatePasswordPolicy(dto.password);

    const emailNormalized = dto.email.toLowerCase().trim();
    const existing = await this.prisma.usuario.findUnique({
      where: { email: emailNormalized },
    });

    if (existing) {
      throw new BadRequestException('El correo electrónico ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Regla ADMIN_EMAIL de respaldo: si no existe ningún admin activo y coincide con ADMIN_EMAIL
    let assignedRole: 'ADMIN' | 'CLIENTE' = 'CLIENTE';
    const adminEmailEnv = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    if (adminEmailEnv && adminEmailEnv === emailNormalized) {
      const activeAdminCount = await this.prisma.usuario.count({
        where: { rol: 'ADMIN', activo: true, eliminadoEn: null },
      });
      if (activeAdminCount === 0) {
        assignedRole = 'ADMIN';
        this.logger.log(`Usuario ${emailNormalized} promovido automáticamente a ADMIN por respaldo ADMIN_EMAIL`);
      }
    }

    const user = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre.trim(),
        email: emailNormalized,
        passwordHash,
        telefono: dto.telefono,
        rol: assignedRole,
        activo: true,
        tokenVersion: 0,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        creadoEn: true,
        tokenVersion: true,
        twoFactorEnabled: true,
      },
    });

    await this.auditService.log({
      actorId: user.id,
      accion: 'REGISTRO_PACIENTE',
      entidad: 'Usuario',
      entidadId: user.id,
      detalle: { email: user.email, rol: user.rol },
      ip,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.rol, user.tokenVersion);
    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto, ip?: string) {
    const emailNormalized = dto.email.toLowerCase().trim();
    const user = await this.prisma.usuario.findUnique({
      where: { email: emailNormalized },
    });

    // 1. Usuario inexistente: hash falso para prevenir ataques de temporización (timing attacks)
    if (!user) {
      await bcrypt.compare(dto.password, '$2b$10$e8Za3wN55Oq8y93b6e82hOeP4Q3tq7R6Qo/S7hI.tY0z3XJ4T39.6');
      await this.auditService.log({
        accion: 'LOGIN_FALLIDO',
        entidad: 'Usuario',
        detalle: { email: emailNormalized, motivo: 'Usuario no encontrado' },
        ip,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Comprobar bloqueo permanente
    if (user.permanentlyLocked) {
      await this.auditService.log({
        actorId: user.id,
        accion: 'LOGIN_BLOQUEADO',
        entidad: 'Usuario',
        entidadId: user.id,
        detalle: { permanente: true },
        ip,
      });
      throw new HttpException(
        {
          statusCode: HTTP_STATUS_LOCKED,
          error: {
            code: 'CUENTA_BLOQUEADA',
            message:
              'La cuenta ha sido bloqueada permanentemente por seguridad tras reiterados intentos fallidos. Contacte a un administrador para su desbloqueo.',
            permanente: true,
          },
        },
        HTTP_STATUS_LOCKED,
      );
    }

    // 3. Comprobar bloqueo temporal
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const retryAfterSeconds = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 1000);
      await this.auditService.log({
        actorId: user.id,
        accion: 'LOGIN_BLOQUEADO',
        entidad: 'Usuario',
        entidadId: user.id,
        detalle: { retryAfterSeconds, lockedUntil: user.lockedUntil },
        ip,
      });
      throw new HttpException(
        {
          statusCode: HTTP_STATUS_LOCKED,
          error: {
            code: 'CUENTA_BLOQUEADA',
            message: `Cuenta bloqueada temporalmente por intentos fallidos. Intente nuevamente en ${retryAfterSeconds} segundos.`,
            permanente: false,
            retryAfterSeconds,
          },
        },
        HTTP_STATUS_LOCKED,
      );
    }

    if (!user.activo || user.eliminadoEn) {
      throw new UnauthorizedException('Credenciales inválidas o cuenta desactivada');
    }

    // 4. Comparar contraseña
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      await this.handleFailedLoginAttempt(user, ip);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 5. Si tiene 2FA activo, emitir token temporal de desafío (5 minutos, scope: 2fa)
    if (user.twoFactorEnabled) {
      const challengeToken = await this.jwtService.signAsync(
        { sub: user.id, email: user.email, scope: '2fa' },
        {
          secret: process.env.JWT_SECRET || 'super-secret-jwt-key-clinica-2026',
          expiresIn: '5m',
        },
      );

      await this.auditService.log({
        actorId: user.id,
        accion: 'LOGIN_DESAFIO_2FA_REQUERIDO',
        entidad: 'Usuario',
        entidadId: user.id,
        ip,
      });

      return {
        requires2FA: true,
        challengeToken,
      };
    }

    // 6. Login exitoso normal: reiniciar contadores de bloqueo
    await this.resetLoginAttempts(user.id);

    await this.auditService.log({
      actorId: user.id,
      accion: 'LOGIN_EXITOSO',
      entidad: 'Usuario',
      entidadId: user.id,
      ip,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.rol, user.tokenVersion);
    const { passwordHash, twoFactorSecretEnc, ...userWithoutSecrets } = user;

    return {
      user: userWithoutSecrets,
      ...tokens,
    };
  }

  /**
   * Máquina de estados de bloqueo escalonado de login (PostgreSQL atómico)
   */
  async handleFailedLoginAttempt(user: { id: string; lockStage: number; failedAttempts: number }, ip?: string) {
    // Incremento atómico en base de datos
    const updated = await this.prisma.usuario.update({
      where: { id: user.id },
      data: { failedAttempts: { increment: 1 } },
      select: { id: true, failedAttempts: true, lockStage: true },
    });

    let lockedUntil: Date | null = null;
    let newLockStage = updated.lockStage;
    let permanentlyLocked = false;
    let auditAction = 'LOGIN_FALLIDO';
    let auditDetalle: Record<string, any> = {
      attempts: updated.failedAttempts,
      stage: updated.lockStage,
    };

    // Etapa 0: 10 intentos -> bloqueo 7 minutos y pasa a etapa 1
    if (updated.lockStage === 0 && updated.failedAttempts >= 10) {
      lockedUntil = new Date(Date.now() + 7 * 60 * 1000); // 7 minutos
      newLockStage = 1;
      auditAction = 'CUENTA_BLOQUEADA_TEMPORAL';
      auditDetalle = { etapa: 1, duracionMinutos: 7 };
    }
    // Etapa 1: 3 intentos -> bloqueo 5 horas y pasa a etapa 2
    else if (updated.lockStage === 1 && updated.failedAttempts >= 3) {
      lockedUntil = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 horas
      newLockStage = 2;
      auditAction = 'CUENTA_BLOQUEADA_TEMPORAL';
      auditDetalle = { etapa: 2, duracionHoras: 5 };
    }
    // Etapa 2: 1 intento -> bloqueo permanente
    else if (updated.lockStage >= 2 && updated.failedAttempts >= 1) {
      permanentlyLocked = true;
      auditAction = 'CUENTA_BLOQUEADA_PERMANENTE';
      auditDetalle = { etapa: 2, permanente: true };
    }

    if (lockedUntil || permanentlyLocked) {
      await this.prisma.usuario.update({
        where: { id: user.id },
        data: {
          failedAttempts: 0,
          lockStage: newLockStage,
          lockedUntil,
          permanentlyLocked,
        },
      });

      // Invalidar caché Redis
      await this.redisService.del(`usuario:auth:${user.id}`);
    }

    await this.auditService.log({
      actorId: user.id,
      accion: auditAction,
      entidad: 'Usuario',
      entidadId: user.id,
      detalle: auditDetalle,
      ip,
    });
  }

  async resetLoginAttempts(userId: string) {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        failedAttempts: 0,
        lockStage: 0,
        lockedUntil: null,
      },
    });
    await this.redisService.del(`usuario:auth:${userId}`);
  }

  // --- MÉTODOS 2FA (TOTP) ---

  async setup2Fa(userId: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const secret = authenticator.generateSecret();
    const issuer = process.env.TOTP_ISSUER || 'Clinica Demo UNSCH';
    const otpauthUrl = authenticator.keyuri(user.email, issuer, secret);
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Guardar secreto cifrado temporalmente en el usuario (aún inactivo)
    const encryptedSecret = CryptoUtil.encrypt(secret);
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { twoFactorSecretEnc: encryptedSecret },
    });

    return {
      secret,
      otpauthUrl,
      qrCode,
    };
  }

  async enable2Fa(userId: string, dto: Enable2FaDto, ip?: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorSecretEnc: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorSecretEnc) {
      throw new BadRequestException('Debe iniciar la configuración con /auth/2fa/setup antes de activar');
    }

    let secret: string;
    try {
      secret = CryptoUtil.decrypt(user.twoFactorSecretEnc);
    } catch {
      throw new BadRequestException('Error al recuperar el secreto de configuración');
    }

    const isValid = authenticator.verify({ token: dto.code.trim(), secret });
    if (!isValid) {
      throw new BadRequestException('Código TOTP inválido. Verifique la hora de su dispositivo e intente de nuevo.');
    }

    // Generar 8 códigos de recuperación alfanuméricos
    const rawRecoveryCodes: string[] = [];
    const hashedCodesData: { codeHash: string }[] = [];

    for (let i = 0; i < 8; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const plainCode = `${part1}-${part2}`;
      rawRecoveryCodes.push(plainCode);
      const codeHash = await bcrypt.hash(plainCode, 10);
      hashedCodesData.push({ codeHash });
    }

    // Guardar códigos y activar 2FA en transacción
    await this.prisma.$transaction([
      this.prisma.recoveryCode.deleteMany({ where: { usuarioId: userId } }),
      this.prisma.recoveryCode.createMany({
        data: hashedCodesData.map((h) => ({ usuarioId: userId, codeHash: h.codeHash })),
      }),
      this.prisma.usuario.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          tokenVersion: { increment: 1 },
        },
      }),
    ]);

    await this.redisService.del(`usuario:auth:${userId}`);

    await this.auditService.log({
      actorId: userId,
      accion: '2FA_ACTIVADO',
      entidad: 'Usuario',
      entidadId: userId,
      ip,
    });

    return {
      message: 'Autenticación de dos factores activada exitosamente',
      recoveryCodes: rawRecoveryCodes,
    };
  }

  async disable2Fa(userId: string, dto: Disable2FaDto, ip?: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, twoFactorSecretEnc: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecretEnc) {
      throw new BadRequestException('El doble factor (2FA) no se encuentra activo');
    }

    const isPasswordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordOk) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const secret = CryptoUtil.decrypt(user.twoFactorSecretEnc);
    const isCodeOk = authenticator.verify({ token: dto.code.trim(), secret });
    if (!isCodeOk) {
      throw new BadRequestException('Código TOTP inválido');
    }

    await this.prisma.$transaction([
      this.prisma.recoveryCode.deleteMany({ where: { usuarioId: userId } }),
      this.prisma.usuario.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecretEnc: null,
          twoFactorLastStep: null,
          tokenVersion: { increment: 1 },
        },
      }),
    ]);

    await this.redisService.del(`usuario:auth:${userId}`);

    await this.auditService.log({
      actorId: userId,
      accion: '2FA_DESACTIVADO',
      entidad: 'Usuario',
      entidadId: userId,
      ip,
    });

    return { message: 'Autenticación de dos factores desactivada exitosamente' };
  }

  async regenerateRecoveryCodes(userId: string, dto: RegenerateRecoveryCodesDto, ip?: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, twoFactorSecretEnc: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecretEnc) {
      throw new BadRequestException('El doble factor (2FA) no está activo');
    }

    const isPasswordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordOk) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const secret = CryptoUtil.decrypt(user.twoFactorSecretEnc);
    const isCodeOk = authenticator.verify({ token: dto.code.trim(), secret });
    if (!isCodeOk) {
      throw new BadRequestException('Código TOTP inválido');
    }

    const rawRecoveryCodes: string[] = [];
    const hashedCodesData: { codeHash: string }[] = [];

    for (let i = 0; i < 8; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const plainCode = `${part1}-${part2}`;
      rawRecoveryCodes.push(plainCode);
      const codeHash = await bcrypt.hash(plainCode, 10);
      hashedCodesData.push({ codeHash });
    }

    await this.prisma.$transaction([
      this.prisma.recoveryCode.deleteMany({ where: { usuarioId: userId } }),
      this.prisma.recoveryCode.createMany({
        data: hashedCodesData.map((h) => ({ usuarioId: userId, codeHash: h.codeHash })),
      }),
    ]);

    await this.auditService.log({
      actorId: userId,
      accion: '2FA_CODIGOS_REGENERADOS',
      entidad: 'Usuario',
      entidadId: userId,
      ip,
    });

    return {
      message: 'Nuevos códigos de recuperación generados',
      recoveryCodes: rawRecoveryCodes,
    };
  }

  async verify2Fa(dto: Verify2FaDto, ip?: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(dto.challengeToken, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-key-clinica-2026',
      });
    } catch {
      throw new UnauthorizedException('El token de verificación 2FA ha expirado o es inválido');
    }

    if (payload.scope !== '2fa') {
      throw new UnauthorizedException('Token inválido para verificación de dos factores');
    }

    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.activo || user.eliminadoEn || !user.twoFactorEnabled || !user.twoFactorSecretEnc) {
      throw new UnauthorizedException('Cuenta inactiva o 2FA no habilitado');
    }

    let verified = false;

    // A. Verificación con código TOTP de 6 dígitos
    if (dto.code) {
      const secret = CryptoUtil.decrypt(user.twoFactorSecretEnc);
      const isCodeValid = authenticator.verify({ token: dto.code.trim(), secret });

      if (isCodeValid) {
        // Anti-reutilización de códigos en la misma ventana de 30s
        const currentStep = Math.floor(Date.now() / 1000 / 30);
        if (user.twoFactorLastStep === currentStep) {
          throw new BadRequestException('Este código ya fue utilizado. Espere el siguiente turno de 30s en su app.');
        }

        await this.prisma.usuario.update({
          where: { id: user.id },
          data: { twoFactorLastStep: currentStep },
        });
        verified = true;
      }
    }
    // B. Verificación alternativa con Código de Recuperación
    else if (dto.recoveryCode) {
      const formattedCode = dto.recoveryCode.trim().toUpperCase();
      const unusedCodes = await this.prisma.recoveryCode.findMany({
        where: { usuarioId: user.id, usadoEn: null },
      });

      for (const rc of unusedCodes) {
        const matches = await bcrypt.compare(formattedCode, rc.codeHash);
        if (matches) {
          await this.prisma.recoveryCode.update({
            where: { id: rc.id },
            data: { usadoEn: new Date() },
          });
          verified = true;
          this.logger.log(`Usuario ${user.id} usó código de recuperación ${rc.id}`);
          break;
        }
      }
    } else {
      throw new BadRequestException('Debe proporcionar un código TOTP o un código de recuperación');
    }

    if (!verified) {
      // Los fallos de 2FA cuentan como intentos fallidos en la máquina de estados
      await this.handleFailedLoginAttempt(user, ip);
      throw new UnauthorizedException('Código de verificación inválido');
    }

    // Éxito: resetear contadores de intentos
    await this.resetLoginAttempts(user.id);

    await this.auditService.log({
      actorId: user.id,
      accion: 'LOGIN_EXITOSO_2FA',
      entidad: 'Usuario',
      entidadId: user.id,
      ip,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.rol, user.tokenVersion);
    const { passwordHash, twoFactorSecretEnc, ...userWithoutSecrets } = user;

    return {
      user: userWithoutSecrets,
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-key-clinica-2026',
      });

      const isBlacklisted = await this.redisService.get(`blacklist:${dto.refreshToken}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('El token ha sido revocado');
      }

      const user = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.activo || user.eliminadoEn) {
        throw new UnauthorizedException('Usuario inactivo o no encontrado');
      }

      // Validar tokenVersion si está presente
      if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
        throw new UnauthorizedException('Sesión revocada');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.rol, user.tokenVersion);
      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.redisService.set(`blacklist:${refreshToken}`, 'true', 604800);
    }
    return { message: 'Sesión cerrada exitosamente' };
  }

  private async generateTokens(userId: string, email: string, rol: string, tokenVersion: number = 0) {
    const payload = { sub: userId, email, rol, tokenVersion };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key-clinica-2026',
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-clinica-2026',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException('El correo electrónico ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        email: dto.email.toLowerCase(),
        passwordHash,
        telefono: dto.telefono,
        rol: 'CLIENTE',
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        creadoEn: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.rol);
    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales inválidas o cuenta desactivada');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.rol);

    const { passwordHash, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
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

      if (!user || !user.activo) {
        throw new UnauthorizedException('Usuario inactivo o no encontrado');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.rol);
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

  private async generateTokens(userId: string, email: string, rol: string) {
    const payload = { sub: userId, email, rol };

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

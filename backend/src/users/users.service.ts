import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { UpdateProfileDto } from './users.dto';
import { validatePasswordPolicy } from '../common/utils/password.util';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        activo: true,
        twoFactorEnabled: true,
        creadoEn: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, ip?: string) {
    const dataToUpdate: any = {};
    if (dto.nombre) dataToUpdate.nombre = dto.nombre.trim();
    if (dto.telefono) dataToUpdate.telefono = dto.telefono.trim();

    if (dto.password) {
      validatePasswordPolicy(dto.password);
      dataToUpdate.passwordHash = await bcrypt.hash(dto.password, 10);
      dataToUpdate.tokenVersion = { increment: 1 }; // Revoca tokens previos
    }

    const updatedUser = await this.prisma.usuario.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        activo: true,
        twoFactorEnabled: true,
        creadoEn: true,
      },
    });

    await this.redisService.del(`usuario:auth:${userId}`);

    if (dto.password) {
      await this.auditService.log({
        actorId: userId,
        accion: 'PASSWORD_CAMBIADO',
        entidad: 'Usuario',
        entidadId: userId,
        ip,
      });
    }

    return updatedUser;
  }
}

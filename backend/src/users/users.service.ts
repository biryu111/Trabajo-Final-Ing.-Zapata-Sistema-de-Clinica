import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './users.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
        creadoEn: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const dataToUpdate: any = {};
    if (dto.nombre) dataToUpdate.nombre = dto.nombre;
    if (dto.telefono) dataToUpdate.telefono = dto.telefono;
    if (dto.password) {
      dataToUpdate.passwordHash = await bcrypt.hash(dto.password, 10);
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
        creadoEn: true,
      },
    });

    return updatedUser;
  }
}

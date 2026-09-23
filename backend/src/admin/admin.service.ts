import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics() {
    const hoyStr = new Date().toISOString().split('T')[0];
    const inicioHoy = new Date(hoyStr + 'T00:00:00.000Z');
    const finHoy = new Date(hoyStr + 'T23:59:59.999Z');

    const [
      citasHoyCount,
      doctoresActivosCount,
      clientesCount,
      totalCitasCount,
      citasPorEstado,
      doctoresTop,
    ] = await Promise.all([
      this.prisma.cita.count({
        where: { fecha: { gte: inicioHoy, lte: finHoy } },
      }),
      this.prisma.doctor.count({ where: { activo: true } }),
      this.prisma.usuario.count({ where: { rol: 'CLIENTE' } }),
      this.prisma.cita.count(),
      this.prisma.cita.groupBy({
        by: ['estado'],
        _count: { id: true },
      }),
      this.prisma.doctor.findMany({
        take: 5,
        select: {
          id: true,
          nombre: true,
          especialidad: { select: { nombre: true } },
          _count: { select: { citas: true } },
        },
        orderBy: {
          citas: { _count: 'desc' },
        },
      }),
    ]);

    return {
      citasHoy: citasHoyCount,
      doctoresActivos: doctoresActivosCount,
      clientesRegistrados: clientesCount,
      totalCitas: totalCitasCount,
      citasPorEstado: citasPorEstado.map((c) => ({
        estado: c.estado,
        cantidad: c._count.id,
      })),
      doctoresMasSolicitados: doctoresTop.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        especialidad: d.especialidad.nombre,
        totalCitas: d._count.citas,
      })),
    };
  }

  async getUsuarios(query?: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (query) {
      where.OR = [
        { nombre: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [usuarios, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
          rol: true,
          activo: true,
          creadoEn: true,
          _count: { select: { citas: true } },
        },
        orderBy: { creadoEn: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return {
      data: usuarios,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async toggleEstadoUsuario(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const actualizado = await this.prisma.usuario.update({
      where: { id: userId },
      data: { activo: !usuario.activo },
      select: { id: true, nombre: true, email: true, activo: true },
    });

    return actualizado;
  }
}

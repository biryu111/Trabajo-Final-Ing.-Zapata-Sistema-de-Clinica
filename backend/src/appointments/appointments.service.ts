import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateCitaDto, ReprogramarCitaDto, AdminUpdateCitaDto, EstadoCita } from './appointments.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async createCita(pacienteId: string, dto: CreateCitaDto) {
    const fechaObj = new Date(dto.fecha + 'T00:00:00.000Z');
    if (isNaN(fechaObj.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }

    const hoyStr = new Date().toISOString().split('T')[0];
    if (dto.fecha < hoyStr) {
      throw new BadRequestException('No se pueden agendar citas en fechas pasadas');
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
      include: { horarios: true },
    });

    if (!doctor || !doctor.activo) {
      throw new NotFoundException('El doctor seleccionado no está disponible');
    }

    return await this.prisma.$transaction(async (tx) => {
      const solapamiento = await tx.cita.findFirst({
        where: {
          doctorId: dto.doctorId,
          fecha: fechaObj,
          horaInicio: dto.horaInicio,
          estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
        },
      });

      if (solapamiento) {
        throw new ConflictException(
          'El horario seleccionado ya fue reservado por otro paciente. Por favor elija otro turno.',
        );
      }

      const nuevaCita = await tx.cita.create({
        data: {
          pacienteId,
          doctorId: dto.doctorId,
          fecha: fechaObj,
          horaInicio: dto.horaInicio,
          horaFin: dto.horaFin,
          estado: 'CONFIRMADA',
        },
        include: {
          doctor: {
            include: { especialidad: true },
          },
          paciente: {
            select: { id: true, nombre: true, email: true, telefono: true },
          },
        },
      });

      await this.redisService.del(`disponibilidad:doctor:${dto.doctorId}:${dto.fecha}`);

      return nuevaCita;
    });
  }

  async getMisCitas(pacienteId: string) {
    return this.prisma.cita.findMany({
      where: { pacienteId },
      include: {
        doctor: {
          include: { especialidad: true },
        },
      },
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'asc' }],
    });
  }

  async cancelarMiCita(pacienteId: string, citaId: string) {
    const cita = await this.prisma.cita.findUnique({
      where: { id: citaId },
    });

    if (!cita) {
      throw new NotFoundException('Cita no encontrada');
    }

    if (cita.pacienteId !== pacienteId) {
      throw new ForbiddenException('No tiene permisos para modificar esta cita');
    }

    if (cita.estado === 'CANCELADA') {
      throw new BadRequestException('La cita ya se encuentra cancelada');
    }

    const fechaHoraCitaStr = `${cita.fecha.toISOString().split('T')[0]}T${cita.horaInicio}:00.000Z`;
    const fechaHoraCita = new Date(fechaHoraCitaStr);
    const ahora = new Date();

    const diferenciaHoras = (fechaHoraCita.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    if (diferenciaHoras < 2 && fechaHoraCita > ahora) {
      throw new BadRequestException(
        'Solo se pueden cancelar citas con al menos 2 horas de anticipación.',
      );
    }

    const citaCancelada = await this.prisma.cita.update({
      where: { id: citaId },
      data: { estado: 'CANCELADA' },
      include: { doctor: true },
    });

    const fechaStr = cita.fecha.toISOString().split('T')[0];
    await this.redisService.del(`disponibilidad:doctor:${cita.doctorId}:${fechaStr}`);

    return citaCancelada;
  }

  async reprogramarMiCita(pacienteId: string, citaId: string, dto: ReprogramarCitaDto) {
    const cita = await this.prisma.cita.findUnique({ where: { id: citaId } });
    if (!cita) throw new NotFoundException('Cita no encontrada');
    if (cita.pacienteId !== pacienteId) throw new ForbiddenException('Acceso no autorizado');

    const nuevaFechaObj = new Date(dto.fecha + 'T00:00:00.000Z');

    return await this.prisma.$transaction(async (tx) => {
      const solapamiento = await tx.cita.findFirst({
        where: {
          doctorId: cita.doctorId,
          fecha: nuevaFechaObj,
          horaInicio: dto.horaInicio,
          id: { not: citaId },
          estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
        },
      });

      if (solapamiento) {
        throw new ConflictException('El nuevo horario solicitado no está disponible');
      }

      const citaActualizada = await tx.cita.update({
        where: { id: citaId },
        data: {
          fecha: nuevaFechaObj,
          horaInicio: dto.horaInicio,
          horaFin: dto.horaFin,
          estado: 'CONFIRMADA',
        },
        include: { doctor: { include: { especialidad: true } } },
      });

      const viejaFechaStr = cita.fecha.toISOString().split('T')[0];
      await this.redisService.del(`disponibilidad:doctor:${cita.doctorId}:${viejaFechaStr}`);
      await this.redisService.del(`disponibilidad:doctor:${cita.doctorId}:${dto.fecha}`);

      return citaActualizada;
    });
  }

  async getAllCitas(doctor?: string, fecha?: string, estado?: EstadoCita) {
    const where: any = {};
    if (doctor) where.doctorId = doctor;
    if (fecha) where.fecha = new Date(fecha + 'T00:00:00.000Z');
    if (estado) where.estado = estado;

    return this.prisma.cita.findMany({
      where,
      include: {
        paciente: { select: { id: true, nombre: true, email: true, telefono: true } },
        doctor: { include: { especialidad: true } },
      },
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'asc' }],
    });
  }

  async updateCitaAdmin(citaId: string, dto: AdminUpdateCitaDto) {
    const cita = await this.prisma.cita.findUnique({ where: { id: citaId } });
    if (!cita) throw new NotFoundException('Cita no encontrada');

    const citaActualizada = await this.prisma.cita.update({
      where: { id: citaId },
      data: {
        estado: dto.estado,
        doctorId: dto.doctorId,
      },
      include: { doctor: true, paciente: true },
    });

    const fechaStr = cita.fecha.toISOString().split('T')[0];
    await this.redisService.del(`disponibilidad:doctor:${cita.doctorId}:${fechaStr}`);

    return citaActualizada;
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateDoctorDto, UpdateDoctorDto, CreateEspecialidadDto } from './doctors.dto';

@Injectable()
export class DoctorsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  // --- Especialidades ---
  async getEspecialidades() {
    const cacheKey = 'especialidades:list';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const especialidades = await this.prisma.especialidad.findMany({
      include: {
        _count: {
          select: { doctores: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    await this.redisService.set(cacheKey, JSON.stringify(especialidades), 300); // 5 min TTL
    return especialidades;
  }

  async createEspecialidad(dto: CreateEspecialidadDto) {
    const existing = await this.prisma.especialidad.findUnique({
      where: { nombre: dto.nombre },
    });
    if (existing) {
      throw new BadRequestException('La especialidad ya existe');
    }

    const especialidad = await this.prisma.especialidad.create({
      data: dto,
    });

    await this.redisService.del('especialidades:list');
    return especialidad;
  }

  // --- Doctores ---
  async getDoctores(especialidadId?: string) {
    const cacheKey = especialidadId
      ? `doctores:esp:${especialidadId}`
      : 'doctores:all';

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const where: any = { activo: true };
    if (especialidadId) {
      where.especialidadId = especialidadId;
    }

    const doctores = await this.prisma.doctor.findMany({
      where,
      include: {
        especialidad: true,
        horarios: true,
      },
      orderBy: { nombre: 'asc' },
    });

    await this.redisService.set(cacheKey, JSON.stringify(doctores), 300);
    return doctores;
  }

  async getDoctorById(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        especialidad: true,
        horarios: true,
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor no encontrado');
    }

    return doctor;
  }

  async getHorariosDoctor(doctorId: string) {
    const doctor = await this.getDoctorById(doctorId);
    return doctor.horarios;
  }

  /**
   * Disponibilidad del Doctor para una fecha (Cache-Aside con TTL corto = 60s)
   */
  async getDisponibilidadDoctor(doctorId: string, fechaStr: string) {
    const cacheKey = `disponibilidad:doctor:${doctorId}:${fechaStr}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { horarios: true },
    });

    if (!doctor || !doctor.activo) {
      throw new NotFoundException('Doctor no encontrado o inactivo');
    }

    const fechaObj = new Date(fechaStr + 'T00:00:00.000Z');
    if (isNaN(fechaObj.getTime())) {
      throw new BadRequestException('Formato de fecha inválido. Use YYYY-MM-DD');
    }

    // Obtener el día de la semana (1=Lunes, 7=Domingo)
    let jsDay = fechaObj.getUTCDay(); // 0=Domingo..6=Sábado
    const diaSemana = jsDay === 0 ? 7 : jsDay;

    const horariosDia = doctor.horarios.filter((h) => h.diaSemana === diaSemana);

    // Obtener citas agendadas para este doctor en esa fecha
    const inicioDia = new Date(fechaStr + 'T00:00:00.000Z');
    const finDia = new Date(fechaStr + 'T23:59:59.999Z');

    const citasReservadas = await this.prisma.cita.findMany({
      where: {
        doctorId,
        fecha: {
          gte: inicioDia,
          lte: finDia,
        },
        estado: {
          in: ['PENDIENTE', 'CONFIRMADA'],
        },
      },
      select: { horaInicio: true, horaFin: true },
    });

    const horasOcupadas = new Set(citasReservadas.map((c) => c.horaInicio));

    // Generar slots de 30 minutos dentro de cada rango de horario
    const slotsDisponibles: { horaInicio: string; horaFin: string; disponible: boolean }[] = [];

    for (const h of horariosDia) {
      const [hStart, mStart] = h.horaInicio.split(':').map(Number);
      const [hEnd, mEnd] = h.horaFin.split(':').map(Number);

      let currentMin = hStart * 60 + mStart;
      const endMin = hEnd * 60 + mEnd;

      while (currentMin + 30 <= endMin) {
        const hInicioStr = `${String(Math.floor(currentMin / 60)).padStart(2, '0')}:${String(currentMin % 60).padStart(2, '0')}`;
        const currentFin = currentMin + 30;
        const hFinStr = `${String(Math.floor(currentFin / 60)).padStart(2, '0')}:${String(currentFin % 60).padStart(2, '0')}`;

        const ocupada = horasOcupadas.has(hInicioStr);

        slotsDisponibles.push({
          horaInicio: hInicioStr,
          horaFin: hFinStr,
          disponible: !ocupada,
        });

        currentMin += 30;
      }
    }

    const resultado = {
      doctorId,
      fecha: fechaStr,
      diaSemana,
      slots: slotsDisponibles,
    };

    // Guardar en Redis Cache-Aside por 60 segundos
    await this.redisService.set(cacheKey, JSON.stringify(resultado), 60);

    return resultado;
  }

  // --- CRUD Admin para Doctores ---
  async createDoctor(dto: CreateDoctorDto) {
    const doctor = await this.prisma.doctor.create({
      data: {
        nombre: dto.nombre,
        biografia: dto.biografia,
        especialidadId: dto.especialidadId,
        horarios: dto.horarios
          ? {
              create: dto.horarios,
            }
          : undefined,
      },
      include: { especialidad: true, horarios: true },
    });

    await this.redisService.delByPattern('doctores:*');
    return doctor;
  }

  async updateDoctor(id: string, dto: UpdateDoctorDto) {
    const doctorExists = await this.prisma.doctor.findUnique({ where: { id } });
    if (!doctorExists) throw new NotFoundException('Doctor no encontrado');

    if (dto.horarios) {
      await this.prisma.horario.deleteMany({ where: { doctorId: id } });
    }

    const doctor = await this.prisma.doctor.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        biografia: dto.biografia,
        especialidadId: dto.especialidadId,
        activo: dto.activo,
        horarios: dto.horarios
          ? {
              create: dto.horarios,
            }
          : undefined,
      },
      include: { especialidad: true, horarios: true },
    });

    await this.redisService.delByPattern('doctores:*');
    await this.redisService.delByPattern(`disponibilidad:doctor:${id}:*`);
    return doctor;
  }

  async deleteDoctor(id: string) {
    await this.prisma.doctor.update({
      where: { id },
      data: { activo: false },
    });
    await this.redisService.delByPattern('doctores:*');
    await this.redisService.delByPattern(`disponibilidad:doctor:${id}:*`);
    return { message: 'Doctor desactivado correctamente' };
  }
}

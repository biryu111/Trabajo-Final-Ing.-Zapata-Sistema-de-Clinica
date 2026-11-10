import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCita } from '@prisma/client';

describe('AppointmentsService (Unit Tests)', () => {
  let service: AppointmentsService;
  let prisma: any;
  let redisService: any;

  const mockPrismaService = {
    doctor: {
      findUnique: jest.fn(),
    },
    cita: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delByPattern: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    prisma = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCita', () => {
    const pacienteId = 'paciente-123';

    it('debe rechazar fechas pasadas con BadRequestException', async () => {
      const pastDto = {
        doctorId: 'doc-1',
        fecha: '2020-01-01',
        horaInicio: '09:00',
        horaFin: '09:30',
      };

      await expect(service.createCita(pacienteId, pastDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createCita(pacienteId, pastDto)).rejects.toThrow(
        'No se pueden agendar citas en fechas pasadas',
      );
    });

    it('debe lanzar NotFoundException si el doctor no existe o está inactivo', async () => {
      // Usar fecha futura
      const futureDate = '2099-12-01';
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.createCita(pacienteId, {
          doctorId: 'doc-inexistente',
          fecha: futureDate,
          horaInicio: '10:00',
          horaFin: '10:30',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ConflictException si ya existe una cita para el doctor en ese horario', async () => {
      const futureDate = '2099-12-01';
      prisma.doctor.findUnique.mockResolvedValue({
        id: 'doc-1',
        nombre: 'Dr. House',
        activo: true,
      });

      // Simular transacción donde tx.cita.findFirst encuentra solapamiento
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          cita: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'cita-existente',
              doctorId: 'doc-1',
              horaInicio: '10:00',
              estado: 'CONFIRMADA',
            }),
            create: jest.fn(),
          },
        };
        return callback(tx);
      });

      await expect(
        service.createCita(pacienteId, {
          doctorId: 'doc-1',
          fecha: futureDate,
          horaInicio: '10:00',
          horaFin: '10:30',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe agendar la cita e invalidar la caché de Redis si el horario está disponible', async () => {
      const futureDate = '2099-12-01';
      prisma.doctor.findUnique.mockResolvedValue({
        id: 'doc-1',
        nombre: 'Dr. House',
        activo: true,
      });

      const nuevaCitaMock = {
        id: 'cita-nueva-123',
        pacienteId,
        doctorId: 'doc-1',
        fecha: new Date(futureDate + 'T00:00:00.000Z'),
        horaInicio: '10:00',
        horaFin: '10:30',
        estado: EstadoCita.CONFIRMADA,
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          cita: {
            findFirst: jest.fn().mockResolvedValue(null), // Sin solapamiento
            create: jest.fn().mockResolvedValue(nuevaCitaMock),
          },
        };
        return callback(tx);
      });

      const result = await service.createCita(pacienteId, {
        doctorId: 'doc-1',
        fecha: futureDate,
        horaInicio: '10:00',
        horaFin: '10:30',
      });

      expect(result).toEqual(nuevaCitaMock);
      // Verifica invalidación de caché
      expect(redisService.del).toHaveBeenCalledWith(
        `disponibilidad:doctor:doc-1:${futureDate}`,
      );
    });
  });

  describe('cancelarMiCita', () => {
    const pacienteId = 'paciente-owner';

    it('debe lanzar NotFoundException si la cita no existe', async () => {
      prisma.cita.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelarMiCita(pacienteId, 'cita-inexistente'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si el paciente no es el dueño de la cita', async () => {
      prisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        pacienteId: 'otro-paciente',
        doctorId: 'doc-1',
        estado: EstadoCita.CONFIRMADA,
      });

      await expect(
        service.cancelarMiCita(pacienteId, 'cita-1'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.cancelarMiCita(pacienteId, 'cita-1'),
      ).rejects.toThrow('No tiene permisos para modificar esta cita');
    });

    it('debe lanzar BadRequestException si la cita ya está cancelada', async () => {
      prisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        pacienteId,
        doctorId: 'doc-1',
        estado: EstadoCita.CANCELADA,
      });

      await expect(
        service.cancelarMiCita(pacienteId, 'cita-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cancelarMiCita(pacienteId, 'cita-1'),
      ).rejects.toThrow('La cita ya se encuentra cancelada');
    });

    it('debe lanzar BadRequestException si faltan menos de 2 horas para la cita', async () => {
      // Fecha en 1 hora
      const ahora = new Date();
      const citaProxima = new Date(ahora.getTime() + 60 * 60 * 1000);
      const fechaStr = citaProxima.toISOString().split('T')[0];
      const horaStr = `${String(citaProxima.getUTCHours()).padStart(2, '0')}:${String(citaProxima.getUTCMinutes()).padStart(2, '0')}`;

      prisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        pacienteId,
        doctorId: 'doc-1',
        fecha: new Date(fechaStr + 'T00:00:00.000Z'),
        horaInicio: horaStr,
        estado: EstadoCita.CONFIRMADA,
      });

      await expect(
        service.cancelarMiCita(pacienteId, 'cita-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cancelarMiCita(pacienteId, 'cita-1'),
      ).rejects.toThrow('Solo se pueden cancelar citas con al menos 2 horas de anticipación.');
    });

    it('debe cancelar la cita e invalidar la caché si tiene más de 2 horas de anticipación', async () => {
      // Cita en el futuro lejano (> 24 horas)
      const fechaFutura = new Date('2099-06-15T00:00:00.000Z');
      const citaValida = {
        id: 'cita-1',
        pacienteId,
        doctorId: 'doc-1',
        fecha: fechaFutura,
        horaInicio: '10:00',
        estado: EstadoCita.CONFIRMADA,
      };

      prisma.cita.findUnique.mockResolvedValue(citaValida);
      prisma.cita.update.mockResolvedValue({
        ...citaValida,
        estado: EstadoCita.CANCELADA,
      });

      const res = await service.cancelarMiCita(pacienteId, 'cita-1');

      expect(res.estado).toBe(EstadoCita.CANCELADA);
      expect(prisma.cita.update).toHaveBeenCalledWith({
        where: { id: 'cita-1' },
        data: { estado: EstadoCita.CANCELADA },
        include: { doctor: true },
      });
      expect(redisService.del).toHaveBeenCalledWith(
        'disponibilidad:doctor:doc-1:2099-06-15',
      );
    });
  });

  describe('getMisCitas', () => {
    it('debe retornar únicamente las citas pertenecientes al paciente', async () => {
      const mockCitas = [
        { id: 'c1', pacienteId: 'p1', doctor: { nombre: 'Dr. A' } },
        { id: 'c2', pacienteId: 'p1', doctor: { nombre: 'Dr. B' } },
      ];
      prisma.cita.findMany.mockResolvedValue(mockCitas);

      const result = await service.getMisCitas('p1');

      expect(result).toEqual(mockCitas);
      expect(prisma.cita.findMany).toHaveBeenCalledWith({
        where: { pacienteId: 'p1' },
        include: { doctor: { include: { especialidad: true } } },
        orderBy: [{ fecha: 'desc' }, { horaInicio: 'asc' }],
      });
    });
  });
});

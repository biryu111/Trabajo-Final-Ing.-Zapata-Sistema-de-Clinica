import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsService } from './doctors.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotFoundException } from '@nestjs/common';

describe('DoctorsService (Unit Tests)', () => {
  let service: DoctorsService;
  let prisma: any;
  let redisService: any;

  const mockPrismaService = {
    especialidad: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    doctor: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    horario: {
      deleteMany: jest.fn(),
    },
    cita: {
      findMany: jest.fn(),
    },
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
        DoctorsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
    prisma = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getEspecialidades (Cache-Aside pattern)', () => {
    it('si hay caché en Redis, NO debe consultar Prisma', async () => {
      const cachedData = [
        { id: 'esp-1', nombre: 'Cardiología', descripcion: 'Corazón' },
      ];
      redisService.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getEspecialidades();

      expect(redisService.get).toHaveBeenCalledWith('especialidades:list');
      expect(result).toEqual(cachedData);
      expect(prisma.especialidad.findMany).not.toHaveBeenCalled();
    });

    it('si no hay caché, consulta Prisma y guarda en Redis', async () => {
      redisService.get.mockResolvedValue(null);
      const dbData = [
        {
          id: 'esp-1',
          nombre: 'Dermatología',
          _count: { doctores: 2 },
        },
      ];
      prisma.especialidad.findMany.mockResolvedValue(dbData);

      const result = await service.getEspecialidades();

      expect(prisma.especialidad.findMany).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalledWith(
        'especialidades:list',
        JSON.stringify(dbData),
        300,
      );
      expect(result).toEqual(dbData);
    });
  });

  describe('getDisponibilidadDoctor (Slots de 30 minutos y citas ocupadas)', () => {
    it('debe devolver directamente desde caché si existe en Redis', async () => {
      const cachedDisponibilidad = {
        doctorId: 'doc-1',
        fecha: '2026-10-15',
        slots: [{ horaInicio: '09:00', horaFin: '09:30', disponible: true }],
      };
      redisService.get.mockResolvedValue(JSON.stringify(cachedDisponibilidad));

      const result = await service.getDisponibilidadDoctor('doc-1', '2026-10-15');

      expect(redisService.get).toHaveBeenCalledWith(
        'disponibilidad:doctor:doc-1:2026-10-15',
      );
      expect(result).toEqual(cachedDisponibilidad);
      expect(prisma.doctor.findUnique).not.toHaveBeenCalled();
    });

    it('genera correctamente los slots de 30 minutos y marca como ocupados los que coinciden con una cita existente', async () => {
      redisService.get.mockResolvedValue(null);

      // Supongamos 2026-10-12 (que es un Lunes, diaSemana = 1)
      const fechaTest = '2026-10-12';

      prisma.doctor.findUnique.mockResolvedValue({
        id: 'doc-1',
        nombre: 'Dra. Ana López',
        activo: true,
        horarios: [
          {
            id: 'h1',
            diaSemana: 1, // Lunes
            horaInicio: '09:00',
            horaFin: '10:30', // Rango: 09:00-09:30, 09:30-10:00, 10:00-10:30
          },
        ],
      });

      // Cita existente en 09:30
      prisma.cita.findMany.mockResolvedValue([
        {
          horaInicio: '09:30',
          horaFin: '10:00',
        },
      ]);

      const result = await service.getDisponibilidadDoctor('doc-1', fechaTest);

      expect(result.doctorId).toBe('doc-1');
      expect(result.fecha).toBe(fechaTest);
      expect(result.slots).toHaveLength(3);

      // Slot 1: 09:00 - 09:30 -> DISPONIBLE
      expect(result.slots[0]).toEqual({
        horaInicio: '09:00',
        horaFin: '09:30',
        disponible: true,
      });

      // Slot 2: 09:30 - 10:00 -> OCUPADO (coincide con la cita)
      expect(result.slots[1]).toEqual({
        horaInicio: '09:30',
        horaFin: '10:00',
        disponible: false,
      });

      // Slot 3: 10:00 - 10:30 -> DISPONIBLE
      expect(result.slots[2]).toEqual({
        horaInicio: '10:00',
        horaFin: '10:30',
        disponible: true,
      });

      // Debe guardarse en Redis por 60 segundos
      expect(redisService.set).toHaveBeenCalledWith(
        `disponibilidad:doctor:doc-1:${fechaTest}`,
        expect.any(String),
        60,
      );
    });

    it('debe lanzar NotFoundException si el doctor no existe o está inactivo', async () => {
      redisService.get.mockResolvedValue(null);
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.getDisponibilidadDoctor('doc-inexistente', '2026-10-12'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDoctorById', () => {
    it('debe retornar el doctor si existe', async () => {
      const mockDoc = { id: 'doc-1', nombre: 'Dr. House', activo: true };
      prisma.doctor.findUnique.mockResolvedValue(mockDoc);

      const result = await service.getDoctorById('doc-1');
      expect(result).toEqual(mockDoc);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.getDoctorById('doc-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

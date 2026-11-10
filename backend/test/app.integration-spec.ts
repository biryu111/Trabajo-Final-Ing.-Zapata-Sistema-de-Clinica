import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

jest.setTimeout(30000);

describe('Backend Integration Tests (Supertest API)', () => {
  let app: INestApplication;

  // Almacén en memoria aislado para pruebas de integración rápidas y reproducibles
  const memoryStore = {
    usuarios: [] as any[],
    especialidades: [] as any[],
    doctores: [] as any[],
    citas: [] as any[],
    cache: new Map<string, string>(),
  };

  const mockPrismaService = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    usuario: {
      findUnique: jest.fn(async ({ where }: any) => {
        return (
          memoryStore.usuarios.find(
            (u) =>
              (where.email && u.email === where.email.toLowerCase()) ||
              (where.id && u.id === where.id),
          ) || null
        );
      }),
      create: jest.fn(async ({ data }: any) => {
        const newUser = {
          id: 'user-' + (memoryStore.usuarios.length + 1),
          nombre: data.nombre,
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          telefono: data.telefono,
          rol: data.rol || 'CLIENTE',
          activo: data.activo !== undefined ? data.activo : true,
          creadoEn: new Date(),
        };
        memoryStore.usuarios.push(newUser);
        return newUser;
      }),
      findMany: jest.fn(async () => memoryStore.usuarios),
      count: jest.fn(async () => memoryStore.usuarios.length),
    },
    doctor: {
      findUnique: jest.fn(async ({ where }: any) => {
        const doc = memoryStore.doctores.find((d) => d.id === where.id);
        return doc || null;
      }),
      findMany: jest.fn(async () => memoryStore.doctores),
    },
    especialidad: {
      findMany: jest.fn(async () => memoryStore.especialidades),
      findUnique: jest.fn(async ({ where }: any) => {
        return (
          memoryStore.especialidades.find(
            (e) => e.nombre === where.nombre || e.id === where.id,
          ) || null
        );
      }),
    },
    cita: {
      findFirst: jest.fn(async ({ where }: any) => {
        const cita = memoryStore.citas.find((c) => {
          const matchDoc = c.doctorId === where.doctorId;
          const matchFecha =
            c.fecha.toISOString().split('T')[0] ===
            where.fecha.toISOString().split('T')[0];
          const matchHora = c.horaInicio === where.horaInicio;
          const matchEstado =
            where.estado?.in ? where.estado.in.includes(c.estado) : true;
          return matchDoc && matchFecha && matchHora && matchEstado;
        });
        return cita || null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const newCita = {
          id: 'cita-' + (memoryStore.citas.length + 1),
          pacienteId: data.pacienteId,
          doctorId: data.doctorId,
          fecha: data.fecha,
          horaInicio: data.horaInicio,
          horaFin: data.horaFin,
          estado: data.estado || 'CONFIRMADA',
          creadoEn: new Date(),
          doctor: {
            id: data.doctorId,
            nombre: 'Dr. Roberto Mendoza',
            especialidad: { nombre: 'Medicina General' },
          },
          paciente: {
            id: data.pacienteId,
            nombre: 'Paciente Test',
            email: 'test@clinica.com',
          },
        };
        memoryStore.citas.push(newCita);
        return newCita;
      }),
      findMany: jest.fn(async ({ where }: any) => {
        let filtered = memoryStore.citas;
        if (where?.pacienteId) {
          filtered = filtered.filter((c) => c.pacienteId === where.pacienteId);
        }
        return filtered;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const cita = memoryStore.citas.find((c) => c.id === where.id);
        if (cita) {
          Object.assign(cita, data);
        }
        return cita;
      }),
      count: jest.fn(async () => memoryStore.citas.length),
    },
    $transaction: jest.fn(async (cb: any) => {
      return cb(mockPrismaService);
    }),
  };

  const mockRedisService = {
    get: jest.fn(async (key: string) => memoryStore.cache.get(key) || null),
    set: jest.fn(async (key: string, value: string) => {
      memoryStore.cache.set(key, value);
    }),
    del: jest.fn(async (key: string) => {
      memoryStore.cache.delete(key);
    }),
    delByPattern: jest.fn(async () => {}),
  };

  beforeAll(async () => {
    // Inicializar datos base
    memoryStore.especialidades.push({ id: 'esp-int-1', nombre: 'Medicina General' });
    memoryStore.doctores.push({
      id: 'doc-int-1',
      nombre: 'Dr. Roberto Mendoza',
      especialidadId: 'esp-int-1',
      activo: true,
      horarios: [{ id: 'h1', diaSemana: 1, horaInicio: '08:00', horaFin: '14:00' }],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  let tokenUserA: string;
  let tokenUserB: string;

  describe('1. Flujo completo de autenticación (POST /auth/register -> POST /auth/login)', () => {
    const userAData = {
      nombre: 'Paciente Alfa',
      email: 'paciente.alfa@clinica.com',
      password: 'Password123!',
      telefono: '+51999888777',
    };

    it('POST /auth/register registra exitosamente a un nuevo cliente (201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userAData)
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(userAData.email.toLowerCase());
      expect(res.body.user.rol).toBe('CLIENTE');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('POST /auth/login autentica y devuelve tokens válidos (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userAData.email,
          password: userAData.password,
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(userAData.email.toLowerCase());
      tokenUserA = res.body.accessToken;
    });

    it('POST /auth/login con contraseña incorrecta devuelve 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userAData.email,
          password: 'PasswordIncorrecto!',
        })
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('2. Control de solapamiento de citas (POST /citas -> 409 Conflict en duplicado)', () => {
    const futureDate = '2099-11-20';
    const citaPayload = {
      doctorId: 'doc-int-1',
      fecha: futureDate,
      horaInicio: '09:00',
      horaFin: '09:30',
    };

    it('primera reserva agendada con éxito (201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/citas')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send(citaPayload)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.doctorId).toBe(citaPayload.doctorId);
      expect(res.body.horaInicio).toBe(citaPayload.horaInicio);
    });

    it('segunda reserva con el mismo horario devuelve 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/citas')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send(citaPayload)
        .expect(409);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.message).toContain('ya fue reservado');
    });
  });

  describe('3. Aislamiento de datos de clientes (GET /citas/mias)', () => {
    it('crea Paciente Beta y verifica que cada usuario solo ve sus propias citas', async () => {
      // Registrar paciente Beta
      const userBData = {
        nombre: 'Paciente Beta',
        email: 'paciente.beta@clinica.com',
        password: 'Password123!',
        telefono: '+51911223344',
      };

      const resRegB = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userBData)
        .expect(201);

      tokenUserB = resRegB.body.accessToken;

      // Paciente Beta agenda una cita en otro horario
      await request(app.getHttpServer())
        .post('/citas')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({
          doctorId: 'doc-int-1',
          fecha: '2099-11-20',
          horaInicio: '11:00',
          horaFin: '11:30',
        })
        .expect(201);

      // Paciente Alfa consulta sus citas
      const resAlfa = await request(app.getHttpServer())
        .get('/citas/mias')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      // Paciente Beta consulta sus citas
      const resBeta = await request(app.getHttpServer())
        .get('/citas/mias')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      // Verificar aislamiento: cada lista debe contener solo citas de su dueño
      expect(resAlfa.body.length).toBeGreaterThanOrEqual(1);
      expect(resBeta.body.length).toBeGreaterThanOrEqual(1);

      const todasCitasAlfaSonDeAlfa = resAlfa.body.every(
        (c: any) => c.horaInicio === '09:00',
      );
      const todasCitasBetaSonDeBeta = resBeta.body.every(
        (c: any) => c.horaInicio === '11:00',
      );

      expect(todasCitasAlfaSonDeAlfa).toBe(true);
      expect(todasCitasBetaSonDeBeta).toBe(true);
    });
  });

  describe('4. Control de acceso RBAC (Rutas /admin/* devuelven 403 Forbidden para CLIENTE)', () => {
    it('GET /admin/usuarios devuelve 403 Forbidden para un usuario con rol CLIENTE', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/usuarios')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.statusCode).toBe(403);
    });

    it('GET /admin/metricas devuelve 403 Forbidden para un usuario con rol CLIENTE', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/metricas')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.statusCode).toBe(403);
    });
  });
});

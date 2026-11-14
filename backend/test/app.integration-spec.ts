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
    recoveryCodes: [] as any[],
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
          tokenVersion: data.tokenVersion || 0,
          failedAttempts: 0,
          lockStage: 0,
          lockedUntil: null,
          permanentlyLocked: false,
          twoFactorEnabled: false,
          twoFactorSecretEnc: null,
          twoFactorLastStep: null,
          eliminadoEn: null,
          creadoEn: new Date(),
        };
        memoryStore.usuarios.push(newUser);
        return newUser;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const u = memoryStore.usuarios.find(
          (user) => (where.id && user.id === where.id) || (where.email && user.email === where.email),
        );
        if (u) {
          if (data.tokenVersion?.increment) {
            u.tokenVersion = (u.tokenVersion || 0) + data.tokenVersion.increment;
          } else if (typeof data.tokenVersion === 'number') {
            u.tokenVersion = data.tokenVersion;
          }
          if (data.failedAttempts?.increment) {
            u.failedAttempts = (u.failedAttempts || 0) + data.failedAttempts.increment;
          } else if (typeof data.failedAttempts === 'number') {
            u.failedAttempts = data.failedAttempts;
          }
          Object.assign(u, { ...data, tokenVersion: u.tokenVersion, failedAttempts: u.failedAttempts });
          return u;
        }
        return null;
      }),
      findMany: jest.fn(async () => memoryStore.usuarios),
      count: jest.fn(async () => memoryStore.usuarios.length),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    recoveryCode: {
      deleteMany: jest.fn(async ({ where }: any) => {
        memoryStore.recoveryCodes = memoryStore.recoveryCodes.filter((rc) => rc.usuarioId !== where.usuarioId);
        return { count: 0 };
      }),
      createMany: jest.fn(async ({ data }: any) => {
        data.forEach((item: any) => {
          memoryStore.recoveryCodes.push({
            id: 'rc-' + (memoryStore.recoveryCodes.length + 1),
            usuarioId: item.usuarioId,
            codeHash: item.codeHash,
            usadoEn: null,
          });
        });
        return { count: data.length };
      }),
      findMany: jest.fn(async ({ where }: any) => {
        return memoryStore.recoveryCodes.filter(
          (rc) => rc.usuarioId === where.usuarioId && (where.usadoEn === null ? rc.usadoEn === null : true),
        );
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const rc = memoryStore.recoveryCodes.find((c) => c.id === where.id);
        if (rc) Object.assign(rc, data);
        return rc;
      }),
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
    $transaction: jest.fn(async (cbOrList: any) => {
      if (Array.isArray(cbOrList)) {
        return Promise.all(cbOrList);
      }
      return cbOrList(mockPrismaService);
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

  describe('5. Bloqueo escalonado de login (11 intentos fallidos -> 423 Locked)', () => {
    it('bloquea la cuenta con 423 al superar los 10 intentos en etapa 0', async () => {
      const lockUserEmail = 'lockout.test@clinica.com';
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nombre: 'Usuario Bloqueo',
          email: lockUserEmail,
          password: 'Password123!',
          telefono: '+51955667788',
        })
        .expect(201);

      // Realizar 10 intentos con contraseña errónea
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: lockUserEmail,
            password: 'BadPassword!',
            turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
          })
          .expect(401);
      }

      // El 11º intento debe responder 423 Locked con CUENTA_BLOQUEADA
      const resLocked = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: lockUserEmail,
          password: 'Password123!', // Incluso con contraseña correcta
          turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
        })
        .expect(423);

      expect(resLocked.body.error).toBeDefined();
      expect(resLocked.body.error.code).toBe('CUENTA_BLOQUEADA');
      expect(resLocked.body.error.permanente).toBe(false);
      expect(resLocked.body.error.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe('6. Flujo completo de 2FA (setup -> enable -> login con requires2FA -> verify2Fa)', () => {
    let twoFaToken: string;
    let twoFaSecret: string;
    let challengeToken: string;
    const user2FaEmail = 'twofa.test@clinica.com';

    it('registra usuario y genera secreto de configuración con /auth/2fa/setup', async () => {
      const resReg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nombre: 'Usuario 2FA',
          email: user2FaEmail,
          password: 'Password123!',
          telefono: '+51944332211',
        })
        .expect(201);

      twoFaToken = resReg.body.accessToken;

      const resSetup = await request(app.getHttpServer())
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${twoFaToken}`)
        .expect(200);

      expect(resSetup.body).toHaveProperty('secret');
      expect(resSetup.body).toHaveProperty('qrCode');
      twoFaSecret = resSetup.body.secret;
    });

    it('activa 2FA con código válido y recibe 8 códigos de recuperación', async () => {
      const { authenticator } = require('otplib');
      const validCode = authenticator.generate(twoFaSecret);

      const resEnable = await request(app.getHttpServer())
        .post('/auth/2fa/enable')
        .set('Authorization', `Bearer ${twoFaToken}`)
        .send({ code: validCode })
        .expect(200);

      expect(resEnable.body).toHaveProperty('recoveryCodes');
      expect(resEnable.body.recoveryCodes).toHaveLength(8);
    });

    it('login con 2FA activo responde requires2FA: true y challengeToken', async () => {
      const resLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user2FaEmail,
          password: 'Password123!',
          turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
        })
        .expect(200);

      expect(resLogin.body.requires2FA).toBe(true);
      expect(resLogin.body.challengeToken).toBeDefined();
      challengeToken = resLogin.body.challengeToken;
    });

    it('completa verificación con /auth/2fa/verify obteniendo tokens completos', async () => {
      const { authenticator } = require('otplib');
      const validCode = authenticator.generate(twoFaSecret);

      const resVerify = await request(app.getHttpServer())
        .post('/auth/2fa/verify')
        .send({
          challengeToken,
          code: validCode,
        })
        .expect(200);

      expect(resVerify.body).toHaveProperty('accessToken');
      expect(resVerify.body).toHaveProperty('refreshToken');
      expect(resVerify.body.user.email).toBe(user2FaEmail);
    });
  });

  describe('7. Autorización fresca e invalidación de tokenVersion', () => {
    it('revoca la sesión inmediatamente al incrementar tokenVersion (401)', async () => {
      const uEmail = 'tokenversion.test@clinica.com';
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nombre: 'Token Version Test',
          email: uEmail,
          password: 'Password123!',
          telefono: '+51999888777',
        })
        .expect(201);

      const token = reg.body.accessToken;

      // El token funciona inicialmente
      await request(app.getHttpServer())
        .get('/citas/mias')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Simular cambio de rol o contraseña que incrementa tokenVersion e invalida caché
      const userInDb = memoryStore.usuarios.find((u) => u.email === uEmail);
      userInDb.tokenVersion = 1;
      memoryStore.cache.delete(`usuario:auth:${userInDb.id}`);

      // Ahora la misma petición debe ser rechazada con 401
      await request(app.getHttpServer())
        .get('/citas/mias')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });
});

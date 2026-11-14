import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService (Unit Tests)', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let redisService: any;
  let auditService: any;

  const mockPrismaService = {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    recoveryCode: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((actions) => Promise.all(actions)),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    redisService = module.get(RedisService);
    auditService = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      nombre: 'Juan Pérez',
      email: 'juan@example.com',
      password: 'Password123!',
      telefono: '+51987654321',
    };

    it('debe lanzar BadRequestException si el email ya existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'juan@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'El correo electrónico ya está registrado',
      );
      expect(prisma.usuario.create).not.toHaveBeenCalled();
    });

    it('debe crear el usuario y retornar tokens si el email no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const createdUser = {
        id: 'u1',
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        telefono: '+51987654321',
        rol: 'CLIENTE',
        creadoEn: new Date(),
      };
      prisma.usuario.create.mockResolvedValue(createdUser);
      jwtService.signAsync
        .mockResolvedValueOnce('mock_access_token')
        .mockResolvedValueOnce('mock_refresh_token');

      const result = await service.register(registerDto);

      expect(prisma.usuario.create).toHaveBeenCalledWith({
        data: {
          nombre: registerDto.nombre,
          email: registerDto.email.toLowerCase(),
          passwordHash: 'hashed_password',
          telefono: registerDto.telefono,
          rol: 'CLIENTE',
          activo: true,
          tokenVersion: 0,
        },
        select: expect.any(Object),
      });
      expect(result).toEqual({
        user: createdUser,
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      });
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'juan@example.com',
      password: 'Password123!',
    };

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Credenciales inválidas');
    });

    it('debe lanzar UnauthorizedException si el usuario está inactivo (activo: false)', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'juan@example.com',
        activo: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow(
        'Credenciales inválidas o cuenta desactivada',
      );
    });

    it('debe lanzar UnauthorizedException si la contraseña no coincide', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'juan@example.com',
        passwordHash: 'hashed_pw',
        activo: true,
      });
      prisma.usuario.update.mockResolvedValue({
        id: 'u1',
        failedAttempts: 1,
        lockStage: 0,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Credenciales inválidas');
    });

    it('debe iniciar sesión exitosamente y retornar usuario sin passwordHash', async () => {
      const mockUser = {
        id: 'u1',
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        passwordHash: 'hashed_pw',
        rol: 'CLIENTE',
        activo: true,
        telefono: '+51987654321',
      };
      prisma.usuario.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('mock_access_token')
        .mockResolvedValueOnce('mock_refresh_token');

      const result: any = await service.login(loginDto);

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.email).toBe('juan@example.com');
      expect(result.accessToken).toBe('mock_access_token');
      expect(result.refreshToken).toBe('mock_refresh_token');
    });
  });

  describe('generateTokens (payload correcto)', () => {
    it('debe firmar tokens con sub, email y rol', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('token_1')
        .mockResolvedValueOnce('token_2');

      const tokens = await (service as any).generateTokens(
        'user-123',
        'test@clinica.com',
        'ADMIN',
        0,
      );

      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        { sub: 'user-123', email: 'test@clinica.com', rol: 'ADMIN', tokenVersion: 0 },
        expect.objectContaining({ expiresIn: expect.any(String) }),
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        { sub: 'user-123', email: 'test@clinica.com', rol: 'ADMIN', tokenVersion: 0 },
        expect.objectContaining({ expiresIn: expect.any(String) }),
      );
      expect(tokens).toEqual({ accessToken: 'token_1', refreshToken: 'token_2' });
    });
  });

  describe('refresh', () => {
    it('debe lanzar UnauthorizedException si el refresh token está en la lista negra de Redis', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', email: 'juan@example.com', rol: 'CLIENTE' });
      redisService.get.mockResolvedValue('true'); // En lista negra

      await expect(service.refresh({ refreshToken: 'revoked_token' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe renovar tokens si el refresh token es válido y no está revocado', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', email: 'juan@example.com', rol: 'CLIENTE' });
      redisService.get.mockResolvedValue(null);
      prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', email: 'juan@example.com', rol: 'CLIENTE', activo: true });
      jwtService.signAsync
        .mockResolvedValueOnce('new_access_token')
        .mockResolvedValueOnce('new_refresh_token');

      const result = await service.refresh({ refreshToken: 'valid_token' });
      expect(result).toEqual({ accessToken: 'new_access_token', refreshToken: 'new_refresh_token' });
    });
  });

  describe('logout', () => {
    it('debe agregar el refresh token a la lista negra en Redis', async () => {
      const res = await service.logout('refresh_token_to_revoke');

      expect(redisService.set).toHaveBeenCalledWith(
        'blacklist:refresh_token_to_revoke',
        'true',
        604800,
      );
      expect(res).toEqual({ message: 'Sesión cerrada exitosamente' });
    });
  });
});

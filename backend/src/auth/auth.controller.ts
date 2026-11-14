import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  Enable2FaDto,
  Disable2FaDto,
  RegenerateRecoveryCodesDto,
  Verify2FaDto,
} from './auth.dto';
import { TurnstileGuard } from '../common/guards/turnstile.guard';
import { AuthGuard } from '../common/guards/auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { getClientIp } from '../common/utils/ip.util';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(TurnstileGuard)
  @ApiOperation({ summary: 'Registrar un nuevo usuario cliente' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente con tokens.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o email duplicado.' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ip = getClientIp(req);
    return this.authService.register(dto, ip);
  }

  @Post('login')
  @UseGuards(TurnstileGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión (Access y Refresh Tokens, o desafío 2FA)' })
  @ApiResponse({ status: 200, description: 'Login correcto o requiere 2FA.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  @ApiResponse({ status: 423, description: 'Cuenta bloqueada temporal o permanentemente.' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = getClientIp(req);
    return this.authService.login(dto, ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar Access Token mediante Refresh Token' })
  @ApiResponse({ status: 200, description: 'Nuevo Access Token generado.' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado.' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión e invalidar Refresh Token' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  // --- RUTAS 2FA (TOTP) ---

  @Post('2fa/setup')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar secreto TOTP y código QR para app autenticadora' })
  async setup2Fa(@GetUser('id') userId: string) {
    return this.authService.setup2Fa(userId);
  }

  @Post('2fa/enable')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar primer código TOTP, activar 2FA y generar códigos de recuperación' })
  async enable2Fa(
    @GetUser('id') userId: string,
    @Body() dto: Enable2FaDto,
    @Req() req: Request,
  ) {
    const ip = getClientIp(req);
    return this.authService.enable2Fa(userId, dto, ip);
  }

  @Post('2fa/disable')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar 2FA requiriendo contraseña y código actual' })
  async disable2Fa(
    @GetUser('id') userId: string,
    @Body() dto: Disable2FaDto,
    @Req() req: Request,
  ) {
    const ip = getClientIp(req);
    return this.authService.disable2Fa(userId, dto, ip);
  }

  @Post('2fa/recovery-codes/regenerate')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerar 8 nuevos códigos de recuperación' })
  async regenerateRecoveryCodes(
    @GetUser('id') userId: string,
    @Body() dto: RegenerateRecoveryCodesDto,
    @Req() req: Request,
  ) {
    const ip = getClientIp(req);
    return this.authService.regenerateRecoveryCodes(userId, dto, ip);
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Completar login verificando código TOTP o código de recuperación' })
  @ApiResponse({ status: 200, description: 'Segundo factor verificado exitosamente.' })
  @ApiResponse({ status: 401, description: 'Código inválido o expirado.' })
  async verify2Fa(@Body() dto: Verify2FaDto, @Req() req: Request) {
    const ip = getClientIp(req);
    return this.authService.verify2Fa(dto, ip);
  }
}

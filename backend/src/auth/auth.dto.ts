import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre completo del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @ApiProperty({ example: 'juan.perez@gmail.com', description: 'Correo electrónico único' })
  @IsEmail({}, { message: 'Formato de correo electrónico inválido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'Contraseña segura (mínimo 8 caracteres, números y letras)' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiPropertyOptional({ example: '+51 987654321', description: 'Número telefónico de contacto' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Token de respuesta de Cloudflare Turnstile' })
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'juan.perez@gmail.com' })
  @IsEmail({}, { message: 'Formato de correo inválido' })
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @ApiPropertyOptional({ description: 'Token de respuesta de Cloudflare Turnstile' })
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token previo' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class Enable2FaDto {
  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos generado por la app autenticadora' })
  @IsString()
  @IsNotEmpty({ message: 'El código TOTP es requerido' })
  code: string;
}

export class Disable2FaDto {
  @ApiProperty({ description: 'Contraseña actual del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;

  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos generado por la app autenticadora' })
  @IsString()
  @IsNotEmpty({ message: 'El código TOTP es requerido' })
  code: string;
}

export class RegenerateRecoveryCodesDto {
  @ApiProperty({ description: 'Contraseña actual del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;

  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos generado por la app autenticadora' })
  @IsString()
  @IsNotEmpty({ message: 'El código TOTP es requerido' })
  code: string;
}

export class Verify2FaDto {
  @ApiProperty({ description: 'Token temporal de desafío 2FA emitido en el login' })
  @IsString()
  @IsNotEmpty({ message: 'El challengeToken es requerido' })
  challengeToken: string;

  @ApiPropertyOptional({ example: '123456', description: 'Código TOTP de 6 dígitos' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'A1B2-C3D4', description: 'Código de recuperación de un solo uso' })
  @IsOptional()
  @IsString()
  recoveryCode?: string;
}

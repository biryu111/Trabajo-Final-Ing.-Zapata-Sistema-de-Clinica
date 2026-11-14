import { BadRequestException } from '@nestjs/common';

const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password123',
  'admin123',
  'admin1234',
  'qwerty123',
  'clinica123',
  'cambiar123',
  'iloveyou',
  'secret123',
]);

export function validatePasswordPolicy(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new BadRequestException('La contraseña es requerida.');
  }

  // Máximo 72 bytes (límite arquitectural de bcrypt)
  const byteLength = Buffer.byteLength(password, 'utf8');
  if (byteLength > 72) {
    throw new BadRequestException('La contraseña excede el límite máximo de 72 bytes permitido.');
  }

  // Mínimo 8 caracteres
  if (password.length < 8) {
    throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.');
  }

  // Al menos una letra
  if (!/[a-zA-Z]/.test(password)) {
    throw new BadRequestException('La contraseña debe incluir al menos una letra.');
  }

  // Al menos un número
  if (!/[0-9]/.test(password)) {
    throw new BadRequestException('La contraseña debe incluir al menos un número.');
  }

  // Rechazo de contraseñas débiles comunes
  if (COMMON_PASSWORDS.has(password.toLowerCase().trim())) {
    throw new BadRequestException('La contraseña elegida es demasiado común y vulnerable. Por favor elija una más segura.');
  }
}

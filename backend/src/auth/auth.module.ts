import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TurnstileGuard } from '../common/guards/turnstile.guard';
import { RequireMfaGuard } from '../common/guards/require-mfa.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key-clinica-2026',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, TurnstileGuard, RequireMfaGuard],
  exports: [AuthService, JwtModule, AuthGuard, RolesGuard, TurnstileGuard, RequireMfaGuard],
})
export class AuthModule {}

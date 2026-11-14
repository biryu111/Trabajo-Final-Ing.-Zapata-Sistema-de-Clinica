import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './users.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { getClientIp } from '../common/utils/ip.util';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('usuarios')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('perfil')
  @ApiOperation({ summary: 'Obtener información del perfil del usuario autenticado' })
  async getProfile(@GetUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('perfil')
  @ApiOperation({ summary: 'Actualizar datos del perfil (nombre, teléfono, contraseña)' })
  async updateProfile(
    @GetUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ) {
    const ip = getClientIp(req);
    return this.usersService.updateProfile(userId, dto, ip);
  }
}

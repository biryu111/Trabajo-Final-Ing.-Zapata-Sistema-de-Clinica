import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metricas')
  @ApiOperation({ summary: 'Obtener métricas agregadas del sistema (Solo Admin)' })
  async getDashboardMetrics() {
    return this.adminService.getDashboardMetrics();
  }

  @Get('usuarios')
  @ApiOperation({ summary: 'Listar todos los usuarios registrados con búsqueda y paginación (Solo Admin)' })
  @ApiQuery({ name: 'q', required: false, description: 'Búsqueda por nombre o email' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getUsuarios(
    @Query('q') query?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.adminService.getUsuarios(query, page, limit);
  }

  @Patch('usuarios/:id/toggle-activo')
  @ApiOperation({ summary: 'Activar o desactivar el acceso de un usuario (Solo Admin)' })
  async toggleEstadoUsuario(@Param('id') userId: string) {
    return this.adminService.toggleEstadoUsuario(userId);
  }
}

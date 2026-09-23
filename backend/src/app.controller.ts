import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Salud')
@Controller()
export class AppController {
  @Get()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint para balanceadores y monitoreo' })
  getHealth() {
    return {
      status: 'ok',
      service: 'Sistema de Gestión Clínica Backend API',
      timestamp: new Date().toISOString(),
    };
  }
}

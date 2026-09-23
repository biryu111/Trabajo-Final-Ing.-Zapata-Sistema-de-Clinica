import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateCitaDto, ReprogramarCitaDto, AdminUpdateCitaDto, EstadoCita } from './appointments.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Citas Médicas')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('citas')
  @ApiOperation({ summary: 'Crear/Reservar una nueva cita médica (Cliente)' })
  async createCita(
    @GetUser('id') pacienteId: string,
    @Body() dto: CreateCitaDto,
  ) {
    return this.appointmentsService.createCita(pacienteId, dto);
  }

  @Get('citas/mias')
  @ApiOperation({ summary: 'Obtener historial y citas activas del paciente autenticado' })
  async getMisCitas(@GetUser('id') pacienteId: string) {
    return this.appointmentsService.getMisCitas(pacienteId);
  }

  @Patch('citas/:id/cancelar')
  @ApiOperation({ summary: 'Cancelar cita médica del cliente (Solo dueño y min 2 horas antes)' })
  async cancelarMiCita(
    @GetUser('id') pacienteId: string,
    @Param('id') citaId: string,
  ) {
    return this.appointmentsService.cancelarMiCita(pacienteId, citaId);
  }

  @Patch('citas/:id/reprogramar')
  @ApiOperation({ summary: 'Reprogramar fecha y hora de cita propia' })
  async reprogramarMiCita(
    @GetUser('id') pacienteId: string,
    @Param('id') citaId: string,
    @Body() dto: ReprogramarCitaDto,
  ) {
    return this.appointmentsService.reprogramarMiCita(pacienteId, citaId, dto);
  }

  @Get('admin/citas')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar todas las citas registradas en el sistema (Solo Admin)' })
  @ApiQuery({ name: 'doctor', required: false })
  @ApiQuery({ name: 'fecha', required: false, example: '2026-09-25' })
  @ApiQuery({ name: 'estado', required: false })
  async getAllCitas(
    @Query('doctor') doctor?: string,
    @Query('fecha') fecha?: string,
    @Query('estado') estado?: EstadoCita,
  ) {
    return this.appointmentsService.getAllCitas(doctor, fecha, estado);
  }

  @Patch('admin/citas/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar estado o reasignar doctor a una cita (Solo Admin)' })
  async updateCitaAdmin(
    @Param('id') citaId: string,
    @Body() dto: AdminUpdateCitaDto,
  ) {
    return this.appointmentsService.updateCitaAdmin(citaId, dto);
  }
}

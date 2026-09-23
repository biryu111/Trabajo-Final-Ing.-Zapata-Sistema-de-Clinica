import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto, UpdateDoctorDto, CreateEspecialidadDto } from './doctors.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Doctores y Especialidades')
@Controller()
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get('especialidades')
  @ApiOperation({ summary: 'Obtener lista de especialidades médicas (Público/Cliente)' })
  async getEspecialidades() {
    return this.doctorsService.getEspecialidades();
  }

  @Post('admin/especialidades')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crear nueva especialidad médica (Solo Admin)' })
  async createEspecialidad(@Body() dto: CreateEspecialidadDto) {
    return this.doctorsService.createEspecialidad(dto);
  }

  @Get('doctores')
  @ApiOperation({ summary: 'Obtener catálogo de doctores activos con filtro opcional por especialidad' })
  @ApiQuery({ name: 'especialidad', required: false, description: 'ID de especialidad' })
  async getDoctores(@Query('especialidad') especialidadId?: string) {
    return this.doctorsService.getDoctores(especialidadId);
  }

  @Get('doctores/:id')
  @ApiOperation({ summary: 'Obtener detalle de un doctor por ID' })
  async getDoctorById(@Param('id') id: string) {
    return this.doctorsService.getDoctorById(id);
  }

  @Get('doctores/:id/horarios')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener la regla general de horarios de atención de un doctor' })
  async getHorariosDoctor(@Param('id') id: string) {
    return this.doctorsService.getHorariosDoctor(id);
  }

  @Get('doctores/:id/disponibilidad')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar slots de disponibilidad de un doctor para una fecha específica (Cache-Aside Redis)' })
  @ApiQuery({ name: 'fecha', required: true, example: '2026-09-25' })
  async getDisponibilidadDoctor(
    @Param('id') id: string,
    @Query('fecha') fecha: string,
  ) {
    return this.doctorsService.getDisponibilidadDoctor(id, fecha);
  }

  @Post('admin/doctores')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dar de alta un nuevo doctor (Solo Admin)' })
  async createDoctor(@Body() dto: CreateDoctorDto) {
    return this.doctorsService.createDoctor(dto);
  }

  @Put('admin/doctores/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar datos u horarios de un doctor (Solo Admin)' })
  async updateDoctor(@Param('id') id: string, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.updateDoctor(id, dto);
  }

  @Delete('admin/doctores/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desactivar un doctor (Solo Admin)' })
  async deleteDoctor(@Param('id') id: string) {
    return this.doctorsService.deleteDoctor(id);
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export type EstadoCita = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'ATENDIDA';

export class CreateCitaDto {
  @ApiProperty({ example: 'UUID_DOCTOR' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ example: '2026-09-25', description: 'Fecha de la cita (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe estar en formato YYYY-MM-DD' })
  fecha: string;

  @ApiProperty({ example: '09:00', description: 'Hora de inicio (HH:mm)' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'La hora debe estar en formato HH:mm' })
  horaInicio: string;

  @ApiProperty({ example: '09:30', description: 'Hora de fin (HH:mm)' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'La hora debe estar en formato HH:mm' })
  horaFin: string;
}

export class ReprogramarCitaDto {
  @ApiProperty({ example: '2026-09-26' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  horaInicio: string;

  @ApiProperty({ example: '10:30' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  horaFin: string;
}

export class AdminUpdateCitaDto {
  @ApiPropertyOptional({ example: 'CONFIRMADA' })
  @IsOptional()
  @IsString()
  estado?: EstadoCita;

  @ApiPropertyOptional({ example: 'UUID_DOCTOR' })
  @IsOptional()
  @IsString()
  doctorId?: string;
}

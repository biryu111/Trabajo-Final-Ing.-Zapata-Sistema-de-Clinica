import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEspecialidadDto {
  @ApiProperty({ example: 'Oftalmología' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ example: 'Atención a la salud visual...' })
  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class HorarioItemDto {
  @ApiProperty({ example: 1, description: '1=Lunes, 2=Martes, ..., 7=Domingo' })
  @IsInt()
  @Min(1)
  @Max(7)
  diaSemana: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @IsNotEmpty()
  horaInicio: string;

  @ApiProperty({ example: '13:00' })
  @IsString()
  @IsNotEmpty()
  horaFin: string;
}

export class CreateDoctorDto {
  @ApiProperty({ example: 'Dr. Fernando Torres' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'ID_DE_LA_ESPECIALIDAD' })
  @IsString()
  @IsNotEmpty()
  especialidadId: string;

  @ApiPropertyOptional({ example: 'Médico especialista en...' })
  @IsOptional()
  @IsString()
  biografia?: string;

  @ApiPropertyOptional({ type: [HorarioItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioItemDto)
  horarios?: HorarioItemDto[];
}

export class UpdateDoctorDto {
  @ApiPropertyOptional({ example: 'Dr. Fernando Torres Editado' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  especialidadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  biografia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ type: [HorarioItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioItemDto)
  horarios?: HorarioItemDto[];
}

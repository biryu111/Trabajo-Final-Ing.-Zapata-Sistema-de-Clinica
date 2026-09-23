export type Rol = 'ADMIN' | 'CLIENTE';

export type EstadoCita = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'ATENDIDA';

export interface User {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
}

export interface Especialidad {
  id: string;
  nombre: string;
  descripcion?: string;
  _count?: {
    doctores: number;
  };
}

export interface Horario {
  id: string;
  doctorId: string;
  diaSemana: number; // 1=Lunes..7=Domingo
  horaInicio: string;
  horaFin: string;
}

export interface Doctor {
  id: string;
  usuarioId?: string;
  nombre: string;
  biografia?: string;
  activo: boolean;
  especialidadId: string;
  especialidad: Especialidad;
  horarios?: Horario[];
}

export interface Cita {
  id: string;
  pacienteId: string;
  doctorId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: EstadoCita;
  creadoEn: string;
  doctor: Doctor;
  paciente?: User;
}

export interface SlotDisponibilidad {
  horaInicio: string;
  horaFin: string;
  disponible: boolean;
}

export interface DisponibilidadResponse {
  doctorId: string;
  fecha: string;
  diaSemana: number;
  slots: SlotDisponibilidad[];
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface MetricasAdmin {
  citasHoy: number;
  doctoresActivos: number;
  clientesRegistrados: number;
  totalCitas: number;
  citasPorEstado: { estado: EstadoCita; cantidad: number }[];
  doctoresMasSolicitados: {
    id: string;
    nombre: string;
    especialidad: string;
    totalCitas: number;
  }[];
}

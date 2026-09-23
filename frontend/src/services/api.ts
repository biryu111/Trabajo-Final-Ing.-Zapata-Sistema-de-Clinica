import axios from 'axios';
import {
  AuthResponse,
  User,
  Doctor,
  Especialidad,
  Cita,
  DisponibilidadResponse,
  MetricasAdmin,
} from '../types';

const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar token de autorización
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejo de refresco automático de token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post<{ accessToken: string; refreshToken: string }>(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken }
          );
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('refreshToken', res.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Servidor de API encapsulado
export const authApi = {
  register: (data: any) => api.post<AuthResponse>('/auth/register', data).then((res) => res.data),
  login: (data: any) => api.post<AuthResponse>('/auth/login', data).then((res) => res.data),
  logout: () => {
    const refreshToken = localStorage.getItem('refreshToken');
    return api.post('/auth/logout', { refreshToken }).then(() => {
      localStorage.clear();
    });
  },
};

export const usersApi = {
  getProfile: () => api.get<User>('/usuarios/perfil').then((res) => res.data),
  updateProfile: (data: any) => api.patch<User>('/usuarios/perfil', data).then((res) => res.data),
};

export const doctorsApi = {
  getEspecialidades: () => api.get<Especialidad[]>('/especialidades').then((res) => res.data),
  getDoctores: (especialidadId?: string) =>
    api.get<Doctor[]>('/doctores', { params: { especialidad: especialidadId } }).then((res) => res.data),
  getDoctorById: (id: string) => api.get<Doctor>(`/doctores/${id}`).then((res) => res.data),
  getDisponibilidad: (doctorId: string, fecha: string) =>
    api.get<DisponibilidadResponse>(`/doctores/${doctorId}/disponibilidad`, { params: { fecha } }).then((res) => res.data),

  // Admin
  createEspecialidad: (data: any) => api.post('/admin/especialidades', data).then((res) => res.data),
  createDoctor: (data: any) => api.post('/admin/doctores', data).then((res) => res.data),
  updateDoctor: (id: string, data: any) => api.put(`/admin/doctores/${id}`, data).then((res) => res.data),
  deleteDoctor: (id: string) => api.delete(`/admin/doctores/${id}`).then((res) => res.data),
};

export const appointmentsApi = {
  createCita: (data: { doctorId: string; fecha: string; horaInicio: string; horaFin: string }) =>
    api.post<Cita>('/citas', data).then((res) => res.data),
  getMisCitas: () => api.get<Cita[]>('/citas/mias').then((res) => res.data),
  cancelarCita: (id: string) => api.patch<Cita>(`/citas/${id}/cancelar`).then((res) => res.data),
  reprogramarCita: (id: string, data: { fecha: string; horaInicio: string; horaFin: string }) =>
    api.patch<Cita>(`/citas/${id}/reprogramar`, data).then((res) => res.data),

  // Admin
  getAllCitas: (params?: { doctor?: string; fecha?: string; estado?: string }) =>
    api.get<Cita[]>('/admin/citas', { params }).then((res) => res.data),
  updateCitaAdmin: (id: string, data: { estado?: string; doctorId?: string }) =>
    api.patch<Cita>(`/admin/citas/${id}`, data).then((res) => res.data),
};

export const adminApi = {
  getMetricas: () => api.get<MetricasAdmin>('/admin/metricas').then((res) => res.data),
  getUsuarios: (params?: { q?: string; page?: number; limit?: number }) =>
    api.get<{ data: User[]; meta: any }>('/admin/usuarios', { params }).then((res) => res.data),
  toggleUsuarioActivo: (id: string) => api.patch(`/admin/usuarios/${id}/toggle-activo`).then((res) => res.data),
};

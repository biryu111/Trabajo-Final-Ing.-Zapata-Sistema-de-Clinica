import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import * as AuthContextModule from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute (Component Test)', () => {
  it('muestra estado de carga cuando loading es true', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      toasts: [],
      showToast: vi.fn(),
      removeToast: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Contenido Protegido</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText(/cargando aplicación/i)).toBeInTheDocument();
    expect(screen.queryByText('Contenido Protegido')).not.toBeInTheDocument();
  });

  it('redirige a /login si no hay usuario autenticado (user es null)', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      toasts: [],
      showToast: vi.fn(),
      removeToast: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/privado']}>
        <Routes>
          <Route
            path="/privado"
            element={
              <ProtectedRoute>
                <div>Zona Secreta</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Página de Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Zona Secreta')).not.toBeInTheDocument();
    expect(screen.getByText('Página de Login')).toBeInTheDocument();
  });

  it('redirige a / si el rol del usuario no coincide con requiredRole', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: {
        id: 'u1',
        nombre: 'Paciente Juan',
        email: 'juan@test.com',
        rol: 'CLIENTE',
        activo: true,
        creadoEn: '2026-01-01',
      },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      toasts: [],
      showToast: vi.fn(),
      removeToast: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin/panel']}>
        <Routes>
          <Route
            path="/admin/panel"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <div>Panel Superadmin</div>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<div>Inicio Landing</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Panel Superadmin')).not.toBeInTheDocument();
    expect(screen.getByText('Inicio Landing')).toBeInTheDocument();
  });

  it('renderiza children si el usuario está autenticado y tiene el rol permitido', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: {
        id: 'u1',
        nombre: 'Admin General',
        email: 'admin@clinica.com',
        rol: 'ADMIN',
        activo: true,
        creadoEn: '2026-01-01',
      },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      toasts: [],
      showToast: vi.fn(),
      removeToast: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin/panel']}>
        <Routes>
          <Route
            path="/admin/panel"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <div>Panel Superadmin</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Panel Superadmin')).toBeInTheDocument();
  });
});

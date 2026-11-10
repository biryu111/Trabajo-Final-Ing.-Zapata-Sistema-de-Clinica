import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authApi } from '../services/api';

vi.mock('../services/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('AuthContext (Unit & Integration Test)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('inicia con user en null cuando no hay token en localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('después de login exitoso, actualiza el usuario y guarda tokens en localStorage', async () => {
    const mockUser = {
      id: 'u-1',
      nombre: 'María García',
      email: 'maria@gmail.com',
      rol: 'CLIENTE' as const,
      activo: true,
      creadoEn: '2026-02-01',
    };

    vi.mocked(authApi.login).mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'access-jwt-token-123',
      refreshToken: 'refresh-jwt-token-456',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        email: 'maria@gmail.com',
        password: 'Password123!',
      });
    });

    expect(result.current.user).toEqual(mockUser);
    expect(localStorage.getItem('accessToken')).toBe('access-jwt-token-123');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-jwt-token-456');
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toEqual(mockUser);
  });

  it('después de register exitoso, actualiza el usuario y guarda tokens en localStorage', async () => {
    const newUser = {
      id: 'u-2',
      nombre: 'Carlos López',
      email: 'carlos@gmail.com',
      rol: 'CLIENTE' as const,
      activo: true,
      creadoEn: '2026-02-01',
    };

    vi.mocked(authApi.register).mockResolvedValueOnce({
      user: newUser,
      accessToken: 'access-token-new',
      refreshToken: 'refresh-token-new',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.register({
        nombre: 'Carlos López',
        email: 'carlos@gmail.com',
        password: 'Password123!',
      });
    });

    expect(result.current.user).toEqual(newUser);
    expect(localStorage.getItem('accessToken')).toBe('access-token-new');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token-new');
  });

  it('logout restablece el estado user a null y limpia la sesión', async () => {
    const mockUser = {
      id: 'u-1',
      nombre: 'María García',
      email: 'maria@gmail.com',
      rol: 'CLIENTE' as const,
      activo: true,
      creadoEn: '2026-02-01',
    };

    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('accessToken', 'token');

    vi.mocked(authApi.logout).mockResolvedValueOnce({} as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });
});

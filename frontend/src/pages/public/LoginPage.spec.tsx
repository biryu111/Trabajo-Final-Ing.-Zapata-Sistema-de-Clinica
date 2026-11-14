import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../../context/AuthContext';
import { ToastContainer } from '../../components/ToastContainer';
import { authApi } from '../../services/api';

vi.mock('../../services/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('LoginPage (Form Component Test)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
          <ToastContainer />
        </MemoryRouter>
      </AuthProvider>,
    );
  };

  it('renderiza correctamente los campos de correo y contraseña', () => {
    renderComponent();

    expect(screen.getByPlaceholderText('ejemplo@correo.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /ingresar a la plataforma/i }),
    ).toBeInTheDocument();
  });

  it('muestra el mensaje de error correspondiente cuando el backend responde con credenciales inválidas', async () => {
    const errorResponse = {
      response: {
        status: 401,
        data: {
          error: {
            statusCode: 401,
            message: 'Credenciales inválidas o cuenta desactivada',
          },
        },
      },
    };

    vi.mocked(authApi.login).mockRejectedValueOnce(errorResponse);

    renderComponent();

    const emailInput = screen.getByPlaceholderText('ejemplo@correo.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', {
      name: /ingresar a la plataforma/i,
    });

    fireEvent.change(emailInput, { target: { value: 'erroneo@clinica.com' } });
    fireEvent.change(passwordInput, { target: { value: 'WrongPassword123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Credenciales inválidas o cuenta desactivada'),
      ).toBeInTheDocument();
    });
  });

  it('muestra la cuenta regresiva y el banner de cuenta bloqueada cuando el backend responde con 423', async () => {
    const lockoutResponse = {
      response: {
        status: 423,
        data: {
          error: {
            statusCode: 423,
            code: 'CUENTA_BLOQUEADA',
            message: 'Cuenta bloqueada temporalmente por intentos fallidos.',
            permanente: false,
            retryAfterSeconds: 300,
          },
        },
      },
    };

    vi.mocked(authApi.login).mockRejectedValueOnce(lockoutResponse);

    renderComponent();

    const emailInput = screen.getByPlaceholderText('ejemplo@correo.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', {
      name: /ingresar a la plataforma/i,
    });

    fireEvent.change(emailInput, { target: { value: 'bloqueado@clinica.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('banner-cuenta-bloqueada')).toBeInTheDocument();
      expect(screen.getByTestId('countdown-timer')).toBeInTheDocument();
      expect(screen.getByText(/05:00/)).toBeInTheDocument();
    });
  });

  it('muestra el segundo paso de verificación 2FA cuando el backend responde requires2FA', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      requires2FA: true,
      challengeToken: 'mock-challenge-token',
    } as any);

    renderComponent();

    const emailInput = screen.getByPlaceholderText('ejemplo@correo.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', {
      name: /ingresar a la plataforma/i,
    });

    fireEvent.change(emailInput, { target: { value: 'user2fa@clinica.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Verificación de Seguridad \(2FA\)/i)).toBeInTheDocument();
      expect(screen.getByTestId('input-totp')).toBeInTheDocument();
      expect(screen.getByTestId('btn-verify-2fa')).toBeInTheDocument();
    });
  });
});

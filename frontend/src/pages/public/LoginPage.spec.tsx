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
});

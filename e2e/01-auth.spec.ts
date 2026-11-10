import { test, expect } from '@playwright/test';
import { mockDefaultApi } from './helpers/mock-api';

test.describe('Escenario 1, 2 y 3: Autenticación y Registro E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultApi(page);
  });

  test('1. Registro de paciente nuevo -> llena formulario -> logueo automático y redirección a dashboard', async ({
    page,
  }) => {
    // Interceptar petición de registro
    await page.route('**/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'u-nuevo-1',
            nombre: 'Carlos Ruiz',
            email: 'carlos.ruiz@gmail.com',
            telefono: '+51987654321',
            rol: 'CLIENTE',
            creadoEn: new Date().toISOString(),
          },
          accessToken: 'mock-access-token-new',
          refreshToken: 'mock-refresh-token-new',
        }),
      });
    });

    await page.goto('/registro');

    // Llenar formulario usando los data-testid estables
    await page.fill('[data-testid="input-nombre"]', 'Carlos Ruiz');
    await page.fill('[data-testid="input-email"]', 'carlos.ruiz@gmail.com');
    await page.fill('[data-testid="input-telefono"]', '+51987654321');
    await page.fill('[data-testid="input-password"]', 'Password123!');

    await page.click('[data-testid="btn-register-submit"]');

    // Verificar redirección automática al dashboard de cliente
    await expect(page).toHaveURL(/.*\/cliente\/dashboard/);
    await expect(page.locator('text=Encuentra a tu especialista ideal')).toBeVisible();
  });

  test('2. Login de paciente existente -> credenciales correctas -> redirige al dashboard cliente', async ({
    page,
  }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'u-maria-1',
            nombre: 'María García',
            email: 'maria.garcia@gmail.com',
            rol: 'CLIENTE',
            creadoEn: '2026-01-01',
          },
          accessToken: 'mock-access-maria',
          refreshToken: 'mock-refresh-maria',
        }),
      });
    });

    await page.goto('/login');

    await page.fill('[data-testid="input-email"]', 'maria.garcia@gmail.com');
    await page.fill('[data-testid="input-password"]', 'Cliente123!');
    await page.click('[data-testid="btn-login-submit"]');

    await expect(page).toHaveURL(/.*\/cliente\/dashboard/);
    await expect(page.locator('text=María García').first()).toBeVisible();
  });

  test('3. Login con credenciales incorrectas -> muestra mensaje de error y no redirige', async ({
    page,
  }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            statusCode: 401,
            message: 'Credenciales inválidas',
          },
        }),
      });
    });

    await page.goto('/login');

    await page.fill('[data-testid="input-email"]', 'noexiste@gmail.com');
    await page.fill('[data-testid="input-password"]', 'Incorrecta123');
    await page.click('[data-testid="btn-login-submit"]');

    // Debe mostrarse el toast de error y permanecer en /login
    await expect(page.locator('text=Credenciales inválidas')).toBeVisible();
    await expect(page).toHaveURL(/.*\/login/);
  });
});

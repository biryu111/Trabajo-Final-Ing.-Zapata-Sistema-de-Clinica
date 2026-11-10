import { test, expect } from '@playwright/test';
import { mockDefaultApi } from './helpers/mock-api';

test.describe('Escenario 9: Control de Acceso y Protección de Rutas E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultApi(page);
  });

  test('9. Control de acceso: un cliente autenticado intenta entrar directo a /admin/dashboard por URL -> es redirigido y nunca ve el panel', async ({
    page,
  }) => {
    // Autenticar como paciente (rol CLIENTE) en el almacenamiento local
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-client-access-token');
      localStorage.setItem('refreshToken', 'mock-client-refresh-token');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'u-paciente-88',
          nombre: 'Luis Paciente',
          email: 'luis@gmail.com',
          rol: 'CLIENTE',
          activo: true,
        }),
      );
    });

    // Intentar acceder a la fuerza a la ruta protegida de administración
    await page.goto('/admin/dashboard');

    // Debe ser redirigido inmediatamente a la raíz (/)
    await expect(page).toHaveURL(/^(?!.*\/admin\/dashboard).*$/);
    await expect(page.locator('[data-testid="admin-dashboard-title"]')).not.toBeVisible();
    await expect(page.locator('text=PANEL ADMINISTRATIVO')).not.toBeVisible();
  });

  test('Usuario no autenticado (anónimo) intenta entrar a /cliente/dashboard -> es redirigido a /login', async ({
    page,
  }) => {
    // Sin tokens en localStorage
    await page.goto('/cliente/dashboard');

    // Debe ser redirigido a /login
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('[data-testid="btn-login-submit"]')).toBeVisible();
  });
});

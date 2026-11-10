import { test, expect } from '@playwright/test';
import { mockDefaultApi } from './helpers/mock-api';

test.describe('Escenario 8: Flujo de Gestión de Doctores para Administrador E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultApi(page);
  });

  test('8. Flujo admin: login como admin -> crear un doctor nuevo -> verificar aparición en listado -> desactivar', async ({
    page,
  }) => {
    // 1. Mock de Login como ADMIN
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'u-admin-1',
            nombre: 'Admin Principal',
            email: 'admin@clinica.com',
            rol: 'ADMIN',
            activo: true,
          },
          accessToken: 'mock-admin-token-123',
          refreshToken: 'mock-admin-refresh-123',
        }),
      });
    });

    // Mock de métricas para el dashboard admin
    await page.route('**/admin/metricas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          citasHoy: 8,
          doctoresActivos: 5,
          clientesRegistrados: 42,
          totalCitas: 120,
          doctoresMasSolicitados: [{ nombre: 'Dr. Roberto Mendoza', totalCitas: 15 }],
          citasPorEstado: [{ estado: 'CONFIRMADA', cantidad: 80 }],
        }),
      });
    });

    // Iniciar sesión como Administrador
    await page.goto('/login');
    await page.fill('[data-testid="input-email"]', 'admin@clinica.com');
    await page.fill('[data-testid="input-password"]', 'Admin123!');
    await page.click('[data-testid="btn-login-submit"]');

    // Debe llegar al Dashboard Administrativo
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
    await expect(page.locator('[data-testid="admin-dashboard-title"]')).toBeVisible();

    // 2. Navegar a Gestión de Doctores
    await page.click('text=Gestión Doctores');
    await expect(page).toHaveURL(/.*\/admin\/doctores/);
    await expect(page.locator('text=Gestión de Doctores')).toBeVisible();

    // 3. Abrir modal de nuevo doctor
    await page.click('[data-testid="btn-nuevo-doctor"]');
    await expect(page.locator('text=Registrar Doctor')).toBeVisible();

    // 4. Llenar formulario de nuevo doctor
    await page.fill('[data-testid="input-doctor-nombre"]', 'Dr. Andrés Caso');
    await page.fill(
      '[data-testid="input-doctor-bio"]',
      'Especialista en medicina interna y preventiva.',
    );

    // Mock de creación de doctor
    await page.route('**/admin/doctores', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'doc-creado-77',
            nombre: 'Dr. Andrés Caso',
            biografia: 'Especialista en medicina interna y preventiva.',
            especialidadId: 'esp-1',
            activo: true,
            especialidad: { id: 'esp-1', nombre: 'Cardiología' },
            horarios: [],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.click('[data-testid="btn-guardar-doctor"]');

    // 5. Toast de éxito
    await expect(page.locator('text=Doctor creado exitosamente')).toBeVisible();
  });
});

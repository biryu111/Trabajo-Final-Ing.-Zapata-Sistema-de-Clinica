import { test, expect } from '@playwright/test';
import { mockDefaultApi } from './helpers/mock-api';

test.describe('Escenarios 4, 5, 6 y 7: Flujo Completo de Citas Médicas E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultApi(page);

    // Pre-autenticar como cliente en el navegador
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-valid-patient-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'u-cliente-1',
          nombre: 'María García',
          email: 'maria.garcia@gmail.com',
          rol: 'CLIENTE',
          activo: true,
        }),
      );
    });
  });

  test('4. Flujo completo de agendar cita: filtrar especialidad -> seleccionar doctor -> elegir horario -> confirmar -> ver en Mis Citas', async ({
    page,
  }) => {
    // Interceptar creación de cita exitosa
    await page.route(/\/citas(\?.*)?$/, async (route) => {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'cita-nueva-99',
            doctorId: payload.doctorId,
            pacienteId: 'u-cliente-1',
            fecha: payload.fecha,
            horaInicio: payload.horaInicio,
            horaFin: payload.horaFin,
            estado: 'CONFIRMADA',
            doctor: {
              nombre: 'Dr. Roberto Mendoza',
              especialidad: { nombre: 'Cardiología' },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/cliente/dashboard');

    // 1. Filtrar por Especialidad
    const filtroCardio = page.locator('[data-testid="btn-filtro-esp-esp-1"]');
    await expect(filtroCardio).toBeVisible();
    await filtroCardio.click();

    // 2. Elegir doctor y abrir modal de horarios
    const btnReservar = page.locator('[data-testid="btn-reservar-doctor-doc-1"]');
    await expect(btnReservar).toBeVisible();
    await btnReservar.click();

    // 3. Modal abierto -> verificar título y seleccionar slot de horario
    await expect(page.locator('text=Reservar Cita Médica')).toBeVisible();
    const slot09 = page.locator('[data-testid="btn-slot-09:00"]');
    await expect(slot09).toBeVisible();
    await slot09.click();

    // 4. Confirmar Reserva
    const btnConfirmar = page.locator('[data-testid="btn-confirmar-cita"]');
    await expect(btnConfirmar).toBeEnabled();
    await btnConfirmar.click();

    // 5. Toast y Redirección a "Mis Citas"
    await expect(page.locator('text=¡Cita agendada exitosamente!')).toBeVisible();
    await expect(page).toHaveURL(/.*\/cliente\/citas/);
    await expect(page.locator('text=Mis Citas Médicas')).toBeVisible();
  });

  test('5. Conflicto de horario: dos intentos de agendar el mismo turno -> muestra error de no disponible', async ({
    page,
  }) => {
    // Simular conflicto (409 Conflict) al intentar agendar un horario ya ocupado
    await page.route(/\/citas(\?.*)?$/, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              statusCode: 409,
              message:
                'El horario seleccionado ya fue reservado por otro paciente. Por favor elija otro turno.',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/cliente/dashboard');

    await page.click('[data-testid="btn-reservar-doctor-doc-1"]');
    await expect(page.locator('text=Reservar Cita Médica')).toBeVisible();

    // Seleccionar slot de 09:30
    await page.click('[data-testid="btn-slot-09:30"]');
    await page.click('[data-testid="btn-confirmar-cita"]');

    // Debe mostrarse el mensaje de conflicto en el toast
    await expect(
      page.locator('text=El horario seleccionado ya fue reservado por otro paciente'),
    ).toBeVisible();
  });

  test('6. Cancelar cita con anticipación suficiente (> 2h) -> la cita se cancela con éxito', async ({
    page,
  }) => {
    // Interceptar cancelación exitosa
    await page.route(/\/citas\/cita-init-1\/cancelar/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'cita-init-1',
          estado: 'CANCELADA',
        }),
      });
    });

    await page.goto('/cliente/citas');
    await expect(page.locator('[data-testid="card-cita-cita-init-1"]')).toBeVisible();

    // Hacer clic en Cancelar Cita
    await page.click('[data-testid="btn-cancelar-cita-cita-init-1"]');

    // Verificar apertura del modal de confirmación
    await expect(page.locator('text=¿Cancelar esta cita?')).toBeVisible();
    await page.click('[data-testid="btn-confirmar-cancelar"]');

    // Debe aparecer el toast de confirmación
    await expect(page.locator('text=Cita cancelada exitosamente')).toBeVisible();
  });

  test('7. Intentar cancelar con menos de 2 horas de anticipación -> se bloquea con mensaje de aviso', async ({
    page,
  }) => {
    // Simular rechazo de cancelación por tiempo límite (400 Bad Request)
    await page.route(/\/citas\/cita-urgente-2\/cancelar/, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            statusCode: 400,
            message:
              'Solo se pueden cancelar citas con al menos 2 horas de anticipación.',
          },
        }),
      });
    });

    await page.goto('/cliente/citas');
    await expect(
      page.locator('[data-testid="card-cita-cita-urgente-2"]'),
    ).toBeVisible();

    await page.click('[data-testid="btn-cancelar-cita-cita-urgente-2"]');
    await expect(page.locator('text=¿Cancelar esta cita?')).toBeVisible();
    await page.click('[data-testid="btn-confirmar-cancelar"]');

    // Verificar que se muestre el mensaje de restricción
    await expect(
      page.locator('text=Solo se pueden cancelar citas con al menos 2 horas de anticipación.'),
    ).toBeVisible();
  });
});

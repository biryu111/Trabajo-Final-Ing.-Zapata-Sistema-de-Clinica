import { Page } from '@playwright/test';

export const mockDefaultApi = async (page: Page) => {
  const doctoresList = [
    {
      id: 'doc-1',
      nombre: 'Dr. Roberto Mendoza',
      biografia: 'Especialista en cardiología con 15 años de experiencia.',
      activo: true,
      especialidad: { id: 'esp-1', nombre: 'Cardiología' },
      horarios: [
        { id: 'h1', diaSemana: 1, horaInicio: '09:00', horaFin: '13:00' },
        { id: 'h2', diaSemana: 2, horaInicio: '09:00', horaFin: '13:00' },
        { id: 'h3', diaSemana: 3, horaInicio: '09:00', horaFin: '13:00' },
        { id: 'h4', diaSemana: 4, horaInicio: '09:00', horaFin: '13:00' },
        { id: 'h5', diaSemana: 5, horaInicio: '09:00', horaFin: '13:00' },
      ],
    },
    {
      id: 'doc-2',
      nombre: 'Dra. Sofía Valdivia',
      biografia: 'Pediatra certificada en atención integral de la infancia.',
      activo: true,
      especialidad: { id: 'esp-2', nombre: 'Pediatría' },
      horarios: [
        { id: 'h6', diaSemana: 1, horaInicio: '10:00', horaFin: '14:00' },
      ],
    },
  ];

  const especialidadesList = [
    { id: 'esp-1', nombre: 'Cardiología', descripcion: 'Salud cardiovascular' },
    { id: 'esp-2', nombre: 'Pediatría', descripcion: 'Atención infantil' },
  ];

  const citasList = [
    {
      id: 'cita-init-1',
      doctorId: 'doc-1',
      pacienteId: 'u-cliente-1',
      fecha: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 días en el futuro
      horaInicio: '09:00',
      horaFin: '09:30',
      estado: 'CONFIRMADA',
      doctor: doctoresList[0],
    },
    {
      id: 'cita-urgente-2',
      doctorId: 'doc-1',
      pacienteId: 'u-cliente-1',
      fecha: new Date(Date.now() + 1800000).toISOString(), // en 30 minutos (< 2 horas)
      horaInicio: '10:00',
      horaFin: '10:30',
      estado: 'CONFIRMADA',
      doctor: doctoresList[0],
    },
  ];

  // Interceptar endpoints de Especialidades
  await page.route(/\/especialidades/, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(especialidadesList),
      });
    } else {
      await route.continue();
    }
  });

  // Interceptar endpoints de Doctores y Disponibilidad
  await page.route(/\/doctores/, async (route) => {
    const url = route.request().url();
    if (url.includes('/disponibilidad')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          doctorId: 'doc-1',
          fecha: '2026-11-11',
          diaSemana: 1,
          slots: [
            { horaInicio: '09:00', horaFin: '09:30', disponible: true },
            { horaInicio: '09:30', horaFin: '10:00', disponible: true },
            { horaInicio: '10:00', horaFin: '10:30', disponible: false },
            { horaInicio: '10:30', horaFin: '11:00', disponible: true },
          ],
        }),
      });
    } else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(doctoresList),
      });
    } else {
      await route.continue();
    }
  });

  // Interceptar listado de citas del paciente
  await page.route(/\/citas\/mias/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(citasList),
    });
  });

  return { doctoresList, especialidadesList, citasList };
};

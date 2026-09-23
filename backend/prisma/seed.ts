import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding base de datos...');

  // 1. Limpiar base de datos
  await prisma.cita.deleteMany();
  await prisma.horario.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.especialidad.deleteMany();
  await prisma.usuario.deleteMany();

  // 2. Crear usuarios base
  const passwordAdminHash = await bcrypt.hash('Admin123!', 10);
  const passwordClienteHash = await bcrypt.hash('Cliente123!', 10);

  const adminUser = await prisma.usuario.create({
    data: {
      nombre: 'Administrador Principal',
      email: 'admin@clinica.com',
      passwordHash: passwordAdminHash,
      telefono: '+51 987654321',
      rol: 'ADMIN',
      activo: true,
    },
  });

  const clienteUser = await prisma.usuario.create({
    data: {
      nombre: 'María García (Paciente)',
      email: 'maria.garcia@gmail.com',
      passwordHash: passwordClienteHash,
      telefono: '+51 912345678',
      rol: 'CLIENTE',
      activo: true,
    },
  });

  console.log(`Usuario Admin creado: ${adminUser.email}`);
  console.log(`Usuario Cliente creado: ${clienteUser.email}`);

  // 3. Crear Especialidades
  const espCardio = await prisma.especialidad.create({
    data: {
      nombre: 'Cardiología',
      descripcion: 'Atención especializada en salud cardiovascular y prevención de arritmias.',
    },
  });

  const espPediatria = await prisma.especialidad.create({
    data: {
      nombre: 'Pediatría',
      descripcion: 'Cuidado integral de la salud de niños y adolescentes.',
    },
  });

  const espDerma = await prisma.especialidad.create({
    data: {
      nombre: 'Dermatología',
      descripcion: 'Tratamiento de afecciones cutáneas y rejuvenecimiento dérmico.',
    },
  });

  const espGeneral = await prisma.especialidad.create({
    data: {
      nombre: 'Medicina General',
      descripcion: 'Diagnóstico general y chequeos preventivos.',
    },
  });

  // 4. Crear Doctores
  const doc1 = await prisma.doctor.create({
    data: {
      nombre: 'Dr. Roberto Mendoza',
      biografia: 'Cardiólogo senior con más de 12 años de experiencia.',
      especialidadId: espCardio.id,
      horarios: {
        create: [
          { diaSemana: 1, horaInicio: '08:00', horaFin: '13:00' },
          { diaSemana: 3, horaInicio: '08:00', horaFin: '13:00' },
          { diaSemana: 5, horaInicio: '08:00', horaFin: '13:00' },
        ],
      },
    },
  });

  const doc2 = await prisma.doctor.create({
    data: {
      nombre: 'Dra. Sofía Valdivia',
      biografia: 'Especialista en pediatría y desarrollo infantil temprano.',
      especialidadId: espPediatria.id,
      horarios: {
        create: [
          { diaSemana: 2, horaInicio: '09:00', horaFin: '14:00' },
          { diaSemana: 4, horaInicio: '09:00', horaFin: '14:00' },
        ],
      },
    },
  });

  const doc3 = await prisma.doctor.create({
    data: {
      nombre: 'Dr. Alejandro Silva',
      biografia: 'Dermatólogo certificado, experto en tratamientos preventivos.',
      especialidadId: espDerma.id,
      horarios: {
        create: [
          { diaSemana: 1, horaInicio: '14:00', horaFin: '18:00' },
          { diaSemana: 3, horaInicio: '14:00', horaFin: '18:00' },
        ],
      },
    },
  });

  const doc4 = await prisma.doctor.create({
    data: {
      nombre: 'Dra. Elena Ramos',
      biografia: 'Médico cirujano general enfocada en atención primaria.',
      especialidadId: espGeneral.id,
      horarios: {
        create: [
          { diaSemana: 1, horaInicio: '08:00', horaFin: '16:00' },
          { diaSemana: 2, horaInicio: '08:00', horaFin: '16:00' },
          { diaSemana: 3, horaInicio: '08:00', horaFin: '16:00' },
          { diaSemana: 4, horaInicio: '08:00', horaFin: '16:00' },
          { diaSemana: 5, horaInicio: '08:00', horaFin: '16:00' },
        ],
      },
    },
  });

  console.log(`Doctores creados: ${doc1.nombre}, ${doc2.nombre}, ${doc3.nombre}, ${doc4.nombre}`);

  // 5. Crear Cita de prueba
  const fechaPrueba = new Date();
  fechaPrueba.setDate(fechaPrueba.getDate() + 1);

  await prisma.cita.create({
    data: {
      pacienteId: clienteUser.id,
      doctorId: doc1.id,
      fecha: fechaPrueba,
      horaInicio: '09:00',
      horaFin: '09:30',
      estado: 'CONFIRMADA',
    },
  });

  console.log('Seeding completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

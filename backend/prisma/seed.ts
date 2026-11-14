import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seeding Idempotente Seguro ---');

  // 1. Especialidades Médicas (Upsert idempotente)
  const especialidadesData = [
    {
      nombre: 'Cardiología',
      descripcion: 'Atención especializada en salud cardiovascular y prevención de arritmias.',
    },
    {
      nombre: 'Pediatría',
      descripcion: 'Cuidado integral de la salud de niños y adolescentes.',
    },
    {
      nombre: 'Dermatología',
      descripcion: 'Tratamiento de afecciones cutáneas y rejuvenecimiento dérmico.',
    },
    {
      nombre: 'Medicina General',
      descripcion: 'Diagnóstico general y chequeos preventivos primarios.',
    },
  ];

  const especialidadesMap: Record<string, string> = {};

  for (const esp of especialidadesData) {
    const record = await prisma.especialidad.upsert({
      where: { nombre: esp.nombre },
      update: { descripcion: esp.descripcion },
      create: { nombre: esp.nombre, descripcion: esp.descripcion },
    });
    especialidadesMap[record.nombre] = record.id;
  }
  console.log('✓ Especialidades médicas verificadas.');

  // 2. Doctores y Horarios Base (Idempotente: findFirst + create)
  const doctoresBase = [
    {
      nombre: 'Dr. Roberto Mendoza',
      biografia: 'Cardiólogo senior con más de 12 años de experiencia en medicina preventiva y cuidados coronarios.',
      especialidadId: especialidadesMap['Cardiología'],
      horarios: [
        { diaSemana: 1, horaInicio: '08:00', horaFin: '13:00' },
        { diaSemana: 3, horaInicio: '08:00', horaFin: '13:00' },
        { diaSemana: 5, horaInicio: '08:00', horaFin: '13:00' },
      ],
    },
    {
      nombre: 'Dra. Sofía Valdivia',
      biografia: 'Especialista en pediatría y desarrollo infantil temprano con vocación y calidez.',
      especialidadId: especialidadesMap['Pediatría'],
      horarios: [
        { diaSemana: 2, horaInicio: '09:00', horaFin: '14:00' },
        { diaSemana: 4, horaInicio: '09:00', horaFin: '14:00' },
      ],
    },
    {
      nombre: 'Dr. Alejandro Silva',
      biografia: 'Dermatólogo certificado, experto en tratamientos preventivos y diagnóstico clínico de la piel.',
      especialidadId: especialidadesMap['Dermatología'],
      horarios: [
        { diaSemana: 1, horaInicio: '14:00', horaFin: '18:00' },
        { diaSemana: 3, horaInicio: '14:00', horaFin: '18:00' },
      ],
    },
    {
      nombre: 'Dra. Elena Ramos',
      biografia: 'Médico cirujano general enfocada en atención primaria y acompañamiento integral de las familias.',
      especialidadId: especialidadesMap['Medicina General'],
      horarios: [
        { diaSemana: 1, horaInicio: '08:00', horaFin: '16:00' },
        { diaSemana: 2, horaInicio: '08:00', horaFin: '16:00' },
        { diaSemana: 3, horaInicio: '08:00', horaFin: '16:00' },
        { diaSemana: 4, horaInicio: '08:00', horaFin: '16:00' },
        { diaSemana: 5, horaInicio: '08:00', horaFin: '16:00' },
      ],
    },
  ];

  for (const doc of doctoresBase) {
    if (!doc.especialidadId) continue;
    let doctorRecord = await prisma.doctor.findFirst({
      where: { nombre: doc.nombre },
    });

    if (!doctorRecord) {
      doctorRecord = await prisma.doctor.create({
        data: {
          nombre: doc.nombre,
          biografia: doc.biografia,
          especialidadId: doc.especialidadId,
          activo: true,
          horarios: {
            create: doc.horarios,
          },
        },
      });
      console.log(`+ Doctor registrado: ${doctorRecord.nombre}`);
    }
  }

  // 3. Usuarios de demostración en entorno de desarrollo local (nunca en producción)
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldSeedDemoUsers = process.env.SEED_DEMO_USERS === 'true';

  if (!isProduction && shouldSeedDemoUsers) {
    const demoEmail = 'paciente.demo@clinica.local';
    const existingDemo = await prisma.usuario.findUnique({
      where: { email: demoEmail },
    });

    if (!existingDemo) {
      const generatedPassword = `Demo-${crypto.randomBytes(4).toString('hex')}!`;
      const passwordHash = await bcrypt.hash(generatedPassword, 10);

      await prisma.usuario.create({
        data: {
          nombre: 'Paciente Demo Local',
          email: demoEmail,
          passwordHash,
          rol: 'CLIENTE',
          activo: true,
        },
      });

      console.log('\n[AVISO DE DESARROLLO LOCAL]');
      console.log(`Usuario demo creado: ${demoEmail}`);
      console.log(`Contraseña generada (guardar ahora): ${generatedPassword}\n`);
    }
  }

  console.log('--- Seeding seguro completado exitosamente (0 datos eliminados) ---');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

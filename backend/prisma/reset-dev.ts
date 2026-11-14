import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDev() {
  const dbUrl = process.env.DATABASE_URL || '';
  const isProduction = process.env.NODE_ENV === 'production';

  const isLocalHost =
    dbUrl.includes('localhost') ||
    dbUrl.includes('127.0.0.1') ||
    dbUrl.includes('@postgres:') ||
    dbUrl.includes('clinica_test');

  if (isProduction || !isLocalHost) {
    console.error('ALERTA DE SEGURIDAD CRÍTICA: Se bloqueó el intento de reiniciar una base de datos no local.');
    console.error(`DATABASE_URL no apunta a localhost/127.0.0.1/postgres. Abortando inmediatamente.`);
    process.exit(1);
  }

  console.log('Reiniciando base de datos de desarrollo local...');
  await prisma.recoveryCode.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.cita.deleteMany();
  await prisma.horario.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.especialidad.deleteMany();
  await prisma.usuario.deleteMany();
  console.log('Base de datos local limpia.');
}

resetDev()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

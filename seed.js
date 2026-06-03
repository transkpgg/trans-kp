const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      nik: 'TKP-ADMIN-01',
      full_name: 'Super Administrator',
      username: 'admin',
      password: hashedPassword,
      jabatan: 'Administrator',
      role: 'super_admin'
    },
  });

  const hashedUser = await bcrypt.hash('user123', 10);
  await prisma.user.upsert({
    where: { username: 'budi' },
    update: {},
    create: {
      nik: 'TKP-USER-01',
      full_name: 'Budi Santoso',
      username: 'budi',
      password: hashedUser,
      jabatan: 'Driver',
      role: 'karyawan'
    }
  });

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

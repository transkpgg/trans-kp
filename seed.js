const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.user.create({
    data: {
      nik: 'ADMIN-001',
      full_name: 'Super Admin',
      username: 'admin',
      password: 'password',
      jabatan: 'Super Admin',
      role: 'super_admin'
    }
  });
  console.log('Admin created');
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

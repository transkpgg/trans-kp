import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Find super_admin
  const admins = await prisma.user.findMany({
    where: { role: 'super_admin' }
  });

  if (admins.length > 0) {
    for (const admin of admins) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { password: hashedPassword }
      });
      console.log(`Reset password for super_admin: ${admin.username} to 'admin123'`);
    }
  } else {
    console.log("No super_admin found. Creating one...");
    await prisma.user.create({
      data: {
        nik: 'ADM-001',
        full_name: 'Super Admin',
        username: 'admin',
        password: hashedPassword,
        jabatan: 'Administrator',
        role: 'super_admin'
      }
    });
    console.log("Created user 'admin' with password 'admin123'");
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function reset() {
  try {
    const newPassword = 'admin'; // <--- NEW PASSWORD
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Check if admin exists
    let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    
    if (admin) {
        await prisma.user.update({
            where: { id: admin.id },
            data: { password: hashedPassword }
        });
        console.log(`Password reset for ${admin.phone || admin.name}`);
    } else {
        await prisma.user.create({
            data: {
                phone: 'admin',
                name: 'Admin',
                password: hashedPassword,
                role: 'ADMIN'
            }
        });
        console.log('Admin created.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

reset();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function reset() {
    const adminUser = await prisma.user.findUnique({
        where: { username: 'admin' }
    });

    if (adminUser) {
        const hashedPassword = await bcrypt.hash('dimmiani2026', 10);
        await prisma.user.update({
            where: { id: adminUser.id },
            data: { password: hashedPassword }
        });
        console.log(`Password for ${adminUser.username} has been reset to: dimmiani2026`);
    } else {
        console.log("Admin user not found.");
    }
}
reset();

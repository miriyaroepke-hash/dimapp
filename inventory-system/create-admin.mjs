import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (existing) {
        console.log('Admin already exists!');
        return;
    }
    const hashed = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.create({
        data: {
            username: 'admin',
            password: hashed,
            name: 'Administrator',
            role: 'admin',
        },
    });
    console.log('Admin created:', user.username, '/ password: admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());

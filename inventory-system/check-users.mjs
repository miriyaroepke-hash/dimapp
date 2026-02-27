import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({ where: { username: 'anna' } });
    if (!user) return console.log('not found');
    console.log(`Hash: ${user.password}`);
    // try to match with 'anna' or something
    const match = await bcrypt.compare('anna', user.password); // Just guessing what user typed 
    console.log(`Matches 'anna': ${match}`);

    // Check if it hashes properly
    const newHash = await bcrypt.hash('anna', 12);
    console.log(`New hash: ${newHash}`);
}

main().finally(() => prisma.$disconnect());

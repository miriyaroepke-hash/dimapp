import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetVitrina() {
    const customer = await prisma.customer.findUnique({
        where: { phone: '+77072424247' }
    });

    if (customer) {
        const hashedPassword = await bcrypt.hash('dimmiani2026', 10);
        await prisma.customer.update({
            where: { id: customer.id },
            data: { password: hashedPassword }
        });
        console.log(`Password for customer ${customer.phone} has been reset to: dimmiani2026`);
    } else {
        console.log("Customer not found.");
    }
}
resetVitrina();

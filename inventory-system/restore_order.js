const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const updated = await prisma.order.update({
        where: { orderNumber: 'ORD-1782927624931' },
        data: { status: 'COMPLETED' } // Restore it so it appears in Daily Plan
    });
    console.log("Restored order:", updated.orderNumber, "Status:", updated.status);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

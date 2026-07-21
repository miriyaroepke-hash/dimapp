const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const order = await prisma.order.findUnique({
        where: { orderNumber: 'ORD-1782927624931' },
        include: { items: true }
    });
    console.log(JSON.stringify(order, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

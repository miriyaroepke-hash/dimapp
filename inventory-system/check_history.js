const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const history = await prisma.orderHistory.findMany({
        where: { orderId: 2058 },
        orderBy: { createdAt: 'desc' }
    });
    console.log(history);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

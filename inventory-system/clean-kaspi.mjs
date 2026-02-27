const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDummyOrders() {
    try {
        console.log("Looking for Kaspi orders with 'UNKNOWN' SKUs or from test user 'Гулсара Б'...");

        // Find dummy Kaspi orders
        const dummyOrders = await prisma.order.findMany({
            where: {
                source: "KASPI",
                OR: [
                    { clientName: { contains: "Гулсара Б" } },
                    { items: { some: { sku: "UNKNOWN" } } }
                ]
            },
            include: { items: true }
        });

        console.log(`Found ${dummyOrders.length} dummy/test Kaspi orders.`);

        if (dummyOrders.length > 0) {
            const orderIds = dummyOrders.map(o => o.id);

            // Delete child order items and history first
            await prisma.orderItem.deleteMany({
                where: { orderId: { in: orderIds } }
            });

            await prisma.orderHistory.deleteMany({
                where: { orderId: { in: orderIds } }
            });

            // Delete the orders
            const { count } = await prisma.order.deleteMany({
                where: { id: { in: orderIds } }
            });

            console.log(`Successfully deleted ${count} dummy orders.`);
        }
    } catch (e) {
        console.error("Error cleaning up dummy orders:", e);
    } finally {
        await prisma.$disconnect();
    }
}

cleanDummyOrders();

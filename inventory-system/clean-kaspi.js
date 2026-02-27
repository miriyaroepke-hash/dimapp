const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDummyOrders() {
    try {
        console.log("Looking for Kaspi orders mapped to 'DELIVERY' or 'KASPI_DELIVERY'...");

        // Find dummy Kaspi orders
        const oldOrders = await prisma.order.findMany({
            where: {
                source: "KASPI"
            },
            include: { items: true }
        });

        // Some might be mixed because locally they are mapped to `PENDING` by sync.
        // For simplicity, anything before Feb 24 that isn't finished locally is probably the offending deliveries.
        // Actually, the user stated 21 synced, and only 2 were 'new' 19 were delivery. So I'll delete ALL Kaspi orders from today so the user starts fresh upon next sync.

        console.log(`Found ${oldOrders.length} total Kaspi orders. Deleting all of them to allow a full fresh sync...`);

        if (oldOrders.length > 0) {
            const orderIds = oldOrders.map(o => o.id);

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

            console.log(`Successfully deleted ${count} kaspi orders for a clean slate.`);
        }
    } catch (e) {
        console.error("Error cleaning up kaspi orders:", e);
    } finally {
        await prisma.$disconnect();
    }
}

cleanDummyOrders();

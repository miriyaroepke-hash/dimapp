const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Recent Transactions:");
    const txs = await prisma.transaction.findMany({
        orderBy: { date: 'desc' },
        take: 30,
        include: { product: true }
    });
    txs.forEach(t => {
        console.log(`[${t.date.toISOString()}] ${t.type} ${t.quantity}x ${t.product?.sku} (${t.product?.name})`);
    });

    console.log("\nRecent Order Histories (Cancellations/Returns):");
    const histories = await prisma.orderHistory.findMany({
        where: {
            OR: [
                { action: 'CANCELLED' },
                { action: 'RETURNED' },
                { action: 'STATUS_CHANGE' },
                { details: { contains: 'возвращен' } },
                { details: { contains: 'отменен' } },
                { details: { contains: 'списан' } }
            ]
        },
        orderBy: { date: 'desc' },
        take: 20,
        include: { order: { include: { items: true } } }
    });

    histories.forEach(h => {
        const itemsStr = h.order?.items.map(i => `${i.quantity}x ${i.sku}`).join(', ');
        console.log(`[${h.date.toISOString()}] Order ${h.order?.orderNumber} - ${h.action}: ${h.details} (Items: ${itemsStr})`);
    });
}
main().finally(() => prisma.$disconnect());

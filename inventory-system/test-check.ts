import prisma from "./src/lib/prisma.ts";

async function main() {
    console.log("Recent Transactions:");
    const txs = await prisma.transaction.findMany({
        orderBy: { date: "desc" },
        take: 30,
        include: { product: true }
    });
    txs.forEach((t: any) => console.log(`[${t.date.toISOString()}] ${t.type} ${t.quantity}x ${t.product?.sku} (${t.product?.name})`));

    console.log("\nRecent Order Histories (Cancellations/Returns):");
    const histories = await prisma.orderHistory.findMany({
        where: {
            OR: [
                { action: "CANCELLED" },
                { action: "RETURNED" },
                { action: "STATUS_CHANGE" },
                { details: { contains: "возвращен" } },
                { details: { contains: "отменен" } },
                { details: { contains: "списан" } }
            ]
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { order: { include: { items: true } } }
    });

    histories.forEach((h: any) => {
        const itemsStr = h.order?.items.map((i: any) => `${i.quantity}x ${i.sku}`).join(", ");
        console.log(`[${h.createdAt.toISOString()}] Order ${h.order?.orderNumber} - ${h.action}: ${h.details} (Items: ${itemsStr})`);
    });
}
main().finally(() => prisma.$disconnect());

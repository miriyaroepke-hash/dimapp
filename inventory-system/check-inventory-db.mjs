import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInventory() {
    try {
        const totalProductsCount = await prisma.product.count();
        const inStockCount = await prisma.product.count({
            where: {
                quantity: { gt: 0 }
            }
        });

        console.log(`Total products: ${totalProductsCount}`);
        console.log(`Products in stock (quantity > 0): ${inStockCount}`);

        if (inStockCount > 0) {
            const firstFew = await prisma.product.findMany({
                where: { quantity: { gt: 0 } },
                take: 3
            });
            console.log("Sample of in-stock products:", firstFew.map(p => ({
                name: p.name,
                qty: p.quantity,
                sku: p.sku
            })));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkInventory();

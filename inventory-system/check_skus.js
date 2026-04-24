const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({ select: { sku: true, name: true, kaspiSku: true }});
    let badSkus = 0;
    products.forEach(p => {
        if (!/^[a-zA-Z0-9_\-]+$/.test(p.sku)) {
            console.log(`Bad SKU detected: [${p.sku}] for product: ${p.name}`);
            badSkus++;
        }
    });
    console.log(`Checked ${products.length} products. Found ${badSkus} bad SKUs.`);
}
main().finally(() => prisma.$disconnect());

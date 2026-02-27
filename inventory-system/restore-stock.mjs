import { PrismaClient } from '@prisma/client';

const TOKEN = 'b664c57c01bc8f3ccc4bc1fcca02456bc4ce9012';
const BASE = 'https://api.moysklad.ru/api/remap/1.2';
const HEADERS = {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept-Encoding': 'gzip',
};

const prisma = new PrismaClient();

async function getStockByUrl(url) {
    const items = [];
    let offset = 0;
    const limit = 100;
    while (true) {
        const resp = await fetch(`${url}?limit=${limit}&offset=${offset}`, { headers: HEADERS });
        if (!resp.ok) break;
        const data = await resp.json();
        items.push(...data.rows);
        if (data.rows.length < limit) break;
        offset += limit;
    }
    return items;
}

async function main() {
    console.log('Fetching stock breakdown from МойСклад...');

    // Get ALL assortment items to sync their stock
    let offset = 0;
    const limit = 100;
    const skuToStock = {};

    while (true) {
        const resp = await fetch(`${BASE}/entity/assortment?limit=${limit}&offset=${offset}`, { headers: HEADERS });
        if (!resp.ok) break;
        const data = await resp.json();

        for (const item of data.rows) {
            const stock = Math.floor(item.stock || 0);
            if (stock <= 0) continue;

            const barcodes = [];
            if (item.barcodes) {
                for (const bc of item.barcodes) {
                    const code = bc.ean13 || bc.ean8 || bc.code128 || bc.gtin || Object.values(bc)[0];
                    if (code) barcodes.push(code);
                }
            }
            if (barcodes.length === 0) continue;

            for (const barcode of barcodes) {
                skuToStock[barcode] = stock;
            }
        }

        if (data.rows.length < limit) break;
        offset += limit;
        process.stdout.write(`\rFetched ${offset} items...`);
    }

    console.log(`\nFound ${Object.keys(skuToStock).length} SKUs with positive stock. Updating DB...`);

    let updated = 0;
    for (const [sku, qty] of Object.entries(skuToStock)) {
        const product = await prisma.product.findFirst({ where: { sku } });
        if (product && product.quantity !== qty) {
            await prisma.product.update({
                where: { id: product.id },
                data: { quantity: qty }
            });
            updated++;
        }
    }

    console.log(`\n✅ Restored stock for ${updated} products in the DB!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

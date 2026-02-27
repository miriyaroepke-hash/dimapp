import { PrismaClient } from '@prisma/client';

const TOKEN = 'b664c57c01bc8f3ccc4bc1fcca02456bc4ce9012';
const BASE = 'https://api.moysklad.ru/api/remap/1.2';
const HEADERS = {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept-Encoding': 'gzip',
};

const prisma = new PrismaClient();

async function fetchAll(url) {
    const items = [];
    let offset = 0;
    const limit = 100;
    while (true) {
        const resp = await fetch(`${url}&limit=${limit}&offset=${offset}`, { headers: HEADERS });
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`API error ${resp.status}: ${text}`);
        }
        const data = await resp.json();
        items.push(...data.rows);
        if (data.rows.length < limit) break;
        offset += limit;
    }
    return items;
}

async function getImageUrl(productHref) {
    try {
        const resp = await fetch(`${productHref}/images?limit=1`, { headers: HEADERS });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data.rows && data.rows.length > 0) {
            // Download image and convert to base64
            const imgResp = await fetch(data.rows[0].miniature.href, { headers: HEADERS });
            if (!imgResp.ok) return null;
            const buffer = await imgResp.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
            return `data:${contentType};base64,${base64}`;
        }
    } catch (e) {
        console.warn('Image error:', e.message);
    }
    return null;
}

async function main() {
    console.log('Fetching stock from МойСклад...');

    // Get assortment with positive stock
    const items = await fetchAll(`${BASE}/entity/assortment?stockMode=positiveStock&fields=stock`);
    console.log(`Found ${items.length} items with positive stock`);

    let imported = 0;
    let skipped = 0;

    for (const item of items) {
        try {
            // Skip bundles and services
            if (item.meta.type !== 'product' && item.meta.type !== 'variant') continue;

            const name = item.name || 'Без названия';
            const price = item.salePrices?.[0]?.value ? item.salePrices[0].value / 100 : 0; // МойСклад stores prices in kopecks
            const quantity = Math.floor(item.stock || 0);
            const sku = item.article || item.code || null;

            // Get barcode
            let barcode = null;
            if (item.barcodes && item.barcodes.length > 0) {
                const bc = item.barcodes[0];
                barcode = bc.ean13 || bc.ean8 || bc.code128 || bc.gtin || Object.values(bc)[0] || null;
            }
            if (!barcode) {
                barcode = item.code || null;
            }

            if (!barcode) {
                console.log(`Skipping "${name}" - no barcode`);
                skipped++;
                continue;
            }

            // Check if already exists
            const existing = await prisma.product.findFirst({ where: { sku: barcode } });
            if (existing) {
                // Update quantity
                await prisma.product.update({ where: { id: existing.id }, data: { quantity } });
                console.log(`Updated stock for "${name}": ${quantity}`);
                imported++;
                continue;
            }

            // Get image
            console.log(`Fetching image for "${name}"...`);
            const image = await getImageUrl(item.meta.href);

            // Create product
            await prisma.product.create({
                data: {
                    name,
                    sku: barcode,
                    price,
                    quantity,
                    size: item.meta.type === 'variant' ? (item.characteristics?.[0]?.value || null) : null,
                    image,
                }
            });
            console.log(`Imported: "${name}" | qty: ${quantity} | price: ${price} | barcode: ${barcode}`);
            imported++;
        } catch (e) {
            console.error(`Error processing item: ${e.message}`);
        }
    }

    console.log(`\nDone! Imported/updated: ${imported}, Skipped (no barcode): ${skipped}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

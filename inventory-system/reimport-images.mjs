import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

const TOKEN = 'b664c57c01bc8f3ccc4bc1fcca02456bc4ce9012';
const BASE = 'https://api.moysklad.ru/api/remap/1.2';
const HEADERS = {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept-Encoding': 'gzip',
};

const prisma = new PrismaClient();
// Cache: parent product href → compressed base64 image
const imageCache = {};

async function compressImage(buffer) {
    try {
        const compressed = await sharp(buffer)
            .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 65 })
            .toBuffer();
        return `data:image/jpeg;base64,${compressed.toString('base64')}`;
    } catch (e) {
        return null;
    }
}

async function getImageForProductHref(productHref) {
    // Check cache first
    if (productHref in imageCache) return imageCache[productHref];

    try {
        const resp = await fetch(`${productHref}/images?limit=1`, { headers: HEADERS });
        if (!resp.ok) { imageCache[productHref] = null; return null; }
        const data = await resp.json();
        if (!data.rows || data.rows.length === 0) { imageCache[productHref] = null; return null; }

        const imgRow = data.rows[0];
        // МойСклад stores images at miniature, then small, then original
        const downloadHref = imgRow.miniature?.href || imgRow.small?.href || imgRow.meta?.downloadHref;
        if (!downloadHref) { imageCache[productHref] = null; return null; }

        const imgResp = await fetch(downloadHref, { headers: HEADERS });
        if (!imgResp.ok) { imageCache[productHref] = null; return null; }
        const buffer = Buffer.from(await imgResp.arrayBuffer());
        const result = await compressImage(buffer);
        imageCache[productHref] = result;
        return result;
    } catch (e) {
        imageCache[productHref] = null;
        return null;
    }
}

async function main() {
    console.log('Fetching all assortment items from МойСклад...');

    // Build map: barcode → parent product href
    const skuToProductHref = {};
    let offset = 0;
    const limit = 100;

    while (true) {
        const resp = await fetch(
            `${BASE}/entity/assortment?limit=${limit}&offset=${offset}`,
            { headers: HEADERS }
        );
        if (!resp.ok) break;
        const data = await resp.json();

        for (const item of data.rows) {
            // Get barcodes
            const barcodes = [];
            if (item.barcodes) {
                for (const bc of item.barcodes) {
                    const code = bc.ean13 || bc.ean8 || bc.code128 || bc.gtin || Object.values(bc)[0];
                    if (code) barcodes.push(code);
                }
            }
            if (barcodes.length === 0) continue;

            // For VARIANT: parent product href is in item.product.meta.href
            // For PRODUCT: it's item.meta.href itself
            let parentHref = item.meta.href;
            if (item.meta.type === 'variant' && item.product?.meta?.href) {
                parentHref = item.product.meta.href;
            }

            for (const barcode of barcodes) {
                skuToProductHref[barcode] = parentHref;
            }
        }

        if (data.rows.length < limit) break;
        offset += limit;
        process.stdout.write(`\rFetched ${offset} items...`);
    }
    console.log(`\nMapped ${Object.keys(skuToProductHref).length} SKUs to parent product URLs`);

    // Get all products without images from DB
    const products = await prisma.product.findMany({
        where: { image: null },
        select: { id: true, name: true, sku: true },
    });
    console.log(`Products without images: ${products.length}`);

    let updated = 0;
    let noImage = 0;
    let i = 0;

    for (const product of products) {
        i++;
        const parentHref = skuToProductHref[product.sku];
        if (!parentHref) { noImage++; continue; }

        const image = await getImageForProductHref(parentHref);

        if (image) {
            await prisma.product.update({ where: { id: product.id }, data: { image } });
            updated++;
            if (updated % 50 === 0) console.log(`[${i}/${products.length}] Updated ${updated} products...`);
        } else {
            noImage++;
        }
    }

    // Also compress already-stored images that may be large PNGs
    console.log('\nCompressing existing PNG images...');
    const withImage = await prisma.product.findMany({
        where: { image: { startsWith: 'data:image/png' } },
        select: { id: true, name: true, image: true },
    });
    console.log(`Found ${withImage.length} PNG images to compress`);
    let compressed = 0;
    for (const p of withImage) {
        const base64 = p.image.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64, 'base64');
        const jpg = await compressImage(buffer);
        if (jpg) {
            await prisma.product.update({ where: { id: p.id }, data: { image: jpg } });
            compressed++;
        }
    }

    console.log(`\n✅ Done!`);
    console.log(`  Updated with new images: ${updated}`);
    console.log(`  PNG → JPEG compressed: ${compressed}`);
    console.log(`  No image in МойСклад: ${noImage}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

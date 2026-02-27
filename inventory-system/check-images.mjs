import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const withImage = await p.product.count({ where: { image: { not: null } } });
const total = await p.product.count();
const sample = await p.product.findFirst({ where: { image: { not: null } }, select: { name: true, image: true } });

console.log(`Total products: ${total}`);
console.log(`With image: ${withImage}`);
if (sample) {
    console.log(`Sample: ${sample.name}`);
    console.log(`Image starts with: ${sample.image?.substring(0, 60)}`);
} else {
    console.log('No products have images!');
}
await p.$disconnect();

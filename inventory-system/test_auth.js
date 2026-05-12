require('dotenv').config({ path: './.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const orders = await prisma.order.findMany({ orderBy: { id: 'desc' }, take: 2 });
    console.log(orders.map(o => ({ id: o.id, customerId: o.customerId, orderNumber: o.orderNumber })));
}
fix();

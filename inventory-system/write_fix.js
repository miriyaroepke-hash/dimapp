const { Client } = require('ssh2');
const conn = new Client();
const run = (cmd) => new Promise((resolve, reject) => {
  conn.exec(cmd, (err, stream) => {
    if (err) return reject(err);
    let out = '';
    stream.on('close', () => resolve(out))
      .on('data', (d) => { out += d; process.stdout.write(d); })
      .stderr.on('data', (d) => { out += d; process.stderr.write(d); });
  });
});

conn.on('ready', async () => {
  try {
    // The ZIP used backslashes so paths are messed up on Linux
    // Directly write the fixed file content using cat heredoc
    const fixedContent = `import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = \`\${process.env.DATABASE_URL}\`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { 
            clientName, 
            clientPhone, 
            city, 
            street, 
            house, 
            apartment, 
            comment, 
            paymentMethod, 
            deliveryCost, 
            totalAmount, 
            items 
        } = body;

        // Generate Order Number
        const currentYear = new Date().getFullYear();
        const orderCount = await prisma.order.count();
        const orderNumber = \`W-\${currentYear}-\${(orderCount + 1).toString().padStart(4, '0')}\`;

        const newOrder = await prisma.order.create({
            data: {
                orderNumber,
                clientName,
                clientPhone,
                city,
                street,
                house,
                apartment,
                comment,
                address: \`\${city}, \${street} \${house} \${apartment}\`,
                deliveryMethod: 'CDEK',
                paymentMethod,
                deliveryCost: deliveryCost || 0,
                totalAmount,
                source: 'WEBSITE',
                status: 'PENDING_CONFIRMATION',
                paymentStatus: 'AWAITING_PAYMENT',
                items: {
                    create: items.map((item: any) => ({
                        productId: item.productId,
                        name: item.name,
                        sku: item.sku,
                        size: item.size,
                        quantity: item.quantity,
                        price: item.price,
                        image: item.image
                    }))
                },
                history: {
                    create: {
                        action: 'CREATED',
                        details: 'Order created from Website checkout'
                    }
                }
            }
        });

        try {
            const { sendTelegramMessage } = await import('@/lib/telegram');
            const itemsString = items.map((i: any) => \`- \${i.name} (\${i.size || '-'}): \${i.quantity} шт.\`).join('\\n');
            const msg = \`🛒 НОВЫЙ ЗАКАЗ С САЙТА
Заказ: \${orderNumber}
Клиент: \${clientName || "-"} (\${clientPhone})
Доставка: \${newOrder.address}
Оплата: \${paymentMethod}
Сумма: \${totalAmount.toLocaleString('ru-RU')} ₸

Корзина:
\${itemsString}\`;
            await sendTelegramMessage(msg);
        } catch (err) {
            console.error("Telegram notification failed:", err);
        }

        return NextResponse.json({ success: true, orderId: newOrder.id, orderNumber: newOrder.orderNumber });

    } catch (error: any) {
        console.error("Order Creation Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
`;

    // Write the file directly via SSH
    const escapedContent = fixedContent.replace(/'/g, "'\\''");
    await run(`cat > /home/ubuntu/vitrina/src/app/api/orders/create/route.ts << 'ENDOFFILE'\n${fixedContent}\nENDOFFILE`);
    await run('echo "File written, checking contents..." && head -5 /home/ubuntu/vitrina/src/app/api/orders/create/route.ts');
    
  } catch(e) { console.error(e); }
  conn.end();
}).connect({ host: '185.146.1.97', port: 22, username: 'ubuntu', password: '@fqTeedmttbzhujkg6oi' });

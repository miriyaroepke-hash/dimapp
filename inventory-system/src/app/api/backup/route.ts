import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    // SECURITY: Limit to cron or secure manual triggers
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const products = await prisma.product.findMany();
        const activeOrders = await prisma.order.findMany({
            where: { status: { not: 'COMPLETED' } },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
        });
        const archivedOrders = await prisma.order.findMany({
            where: { status: 'COMPLETED' },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
        });

        // Generate Excel Workbook
        const wb = XLSX.utils.book_new();

        // 1. Products Sheet
        const productsData = products.map(p => ({
            'ID': p.id,
            'Наименование': p.name,
            'Штрихкод': p.sku,
            'Арт. Kaspi': p.kaspiSku || '-',
            'Размер': p.size || '-',
            'Цена': p.price,
            'Остаток': p.quantity
        }));
        if (productsData.length) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productsData), "Склад");
        }

        // Helper for Orders styling
        const mapOrders = (orders: typeof activeOrders) => orders.map(o => ({
            'Заказ №': o.orderNumber,
            'Дата': format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm'),
            'Доставка': o.deliveryMethod,
            'Клиент': o.clientName || '-',
            'Телефон': o.clientPhone || '-',
            'Город': o.city || '-',
            'Адрес': o.address || '-',
            'Товары': o.items.map(i => `${i.name} (${i.size || '-'}) x${i.quantity}`).join(', '),
            'Оплата': o.paymentMethod,
            'Итого': o.totalAmount,
            'Статус': o.status,
            'Трек-код': o.trackingNumber || '-'
        }));

        // 2. Active Orders Sheet
        const activeOrdersData = mapOrders(activeOrders);
        if (activeOrdersData.length) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activeOrdersData), "Активные Заказы");
        }

        // 3. Archive Sheet
        const archiveOrdersData = mapOrders(archivedOrders);
        if (archiveOrdersData.length) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(archiveOrdersData), "Архив");
        }

        // Generate binary string -> buffer
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const dateStr = format(new Date(), 'yyyy-MM-dd');
        const filename = `Dimmiani_Backup_${dateStr}.xlsx`;

        // Send to Telegram
        const botToken = '8265144846:AAGRAFhMQ-eplanFEbmqnbFCy9y4rJwbdgE';
        const chatIdEnv = '-1001807702533';
        
        if (botToken && chatIdEnv) {
            const chatIds = chatIdEnv.split(",").map(id => id.trim()).filter(Boolean);
            
            for (const chatId of chatIds) {
                try {
                    const formData = new FormData();
                    formData.append('chat_id', chatId);
                    formData.append('caption', `📦 <b>Ежедневный бэкап базы</b>\n\nДата: ${dateStr}\nАктивных заказов: ${activeOrders.length}\n\nСохраните этот файл на случай сбоев.`);
                    formData.append('parse_mode', 'HTML');
                    
                    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    formData.append('document', blob, filename);
                    
                    const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
                    const res = await fetch(url, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!res.ok) {
                        const errText = await res.text();
                        console.error(`Telegram sendDocument failed for ${chatId}:`, errText);
                    }
                } catch (e) {
                    console.error(`Failed to send Telegram backup to ${chatId}`, e);
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Backup sent to Telegram successfully' });

    } catch (error: any) {
        console.error('Backup cron job error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error?.message || String(error)
        }, { status: 500 });
    }
}

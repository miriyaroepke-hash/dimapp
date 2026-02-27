import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    // Для безопасности (чтобы только Vercel Cron мог запускать этот роут)
    // Можно раскомментировать после добавления CRON_SECRET в Vercel Environment Variables
    /*
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    */

    try {
        // 1. Все товары и активные заказы (статус НЕ 'COMPLETED')
        const products = await prisma.product.findMany();

        const activeOrders = await prisma.order.findMany({
            where: {
                status: {
                    not: 'COMPLETED',
                },
            },
            include: {
                items: true, // Включаем товары в заказе
            }
        });

        const activeData = {
            products,
            activeOrders,
        };

        // 2. Все завершённые заказы ('COMPLETED')
        // Данные клиента (clientName, clientPhone, address) уже находятся внутри модели Order
        const archivedOrders = await prisma.order.findMany({
            where: {
                status: 'COMPLETED',
            },
            include: {
                items: true,
            }
        });

        const archiveData = {
            completedOrders: archivedOrders,
        };

        const activeJsonString = JSON.stringify(activeData, null, 2);
        const archiveJsonString = JSON.stringify(archiveData, null, 2);

        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!BOT_TOKEN || !CHAT_ID) {
            console.error('Telegram credentials missing');
            return NextResponse.json({ error: 'Telegram credentials missing' }, { status: 500 });
        }

        // Вспомогательная функция для отправки документа в Telegram
        async function sendToTelegram(filename: string, content: string) {
            const formData = new FormData();
            formData.append('chat_id', CHAT_ID as string);

            const blob = new Blob([content], { type: 'application/json' });
            formData.append('document', blob, filename);

            const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Telegram error: ${errorText}`);
            }

            return res.json();
        }

        // Отправляем файлы в Telegram
        await sendToTelegram('active_data.json', activeJsonString);
        await sendToTelegram('archive_data.json', archiveJsonString);

        return NextResponse.json({ success: true, message: 'Backups successfully sent to Telegram' });

    } catch (error) {
        console.error('Backup cron job error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

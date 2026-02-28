import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
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
        const EMAIL_USER = process.env.EMAIL_USER;
        const EMAIL_PASS = process.env.EMAIL_PASS;
        const TARGET_EMAIL = process.env.BACKUP_TARGET_EMAIL;

        if (!EMAIL_USER || !EMAIL_PASS || !TARGET_EMAIL) {
            console.error('Email credentials missing');
            return NextResponse.json({ error: 'Email credentials missing in Vercel env' }, { status: 500 });
        }

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

        // Send Email
        const transporter = nodemailer.createTransport({
            service: 'gmail', // You can change this if you use Yandex or Mail.ru
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Dimmiani System" <${EMAIL_USER}>`,
            to: TARGET_EMAIL,
            subject: `Ежедневный бэкап: Склад и Заказы (${dateStr})`,
            text: `Во вложении свежая выгрузка остатков склада и всех заказов на ${dateStr}.`,
            attachments: [
                {
                    filename: filename,
                    content: excelBuffer
                }
            ]
        });

        return NextResponse.json({ success: true, message: 'Backup emailed successfully' });

    } catch (error: any) {
        console.error('Backup cron job error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error?.message || String(error)
        }, { status: 500 });
    }
}

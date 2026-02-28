import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Called daily at 00:00 by Vercel Cron to deduct TotalDailyDebtService from balance
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const activeCredits = await prisma.credit.findMany({
            where: { isActive: true },
        });

        const totalDailyDebt = activeCredits.reduce((sum, c) => sum + c.dailyPayment, 0);

        if (totalDailyDebt === 0) {
            return NextResponse.json({ success: true, deducted: 0 });
        }

        // Get current balance (create if doesn't exist)
        const currentBalance = await prisma.balance.upsert({
            where: { id: 1 },
            update: {},
            create: { id: 1, amount: 0 },
        });

        const newAmount = currentBalance.amount - totalDailyDebt;

        await prisma.balance.update({
            where: { id: 1 },
            data: { amount: newAmount },
        });

        return NextResponse.json({ success: true, deducted: totalDailyDebt, newBalance: newAmount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

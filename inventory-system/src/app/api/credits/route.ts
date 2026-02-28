import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const credits = await prisma.credit.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(credits);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, principal, dailyPayment, monthlyPayment, startDate, durationMonths } = body;

        if (!name || !principal || !dailyPayment || !monthlyPayment || !startDate || !durationMonths) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const credit = await prisma.credit.create({
            data: {
                name,
                principal: parseFloat(principal),
                dailyPayment: parseFloat(dailyPayment),
                monthlyPayment: parseFloat(monthlyPayment),
                startDate: new Date(startDate),
                durationMonths: parseInt(durationMonths),
            },
        });

        return NextResponse.json(credit, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

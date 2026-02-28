import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        // Upsert: create the balance record if it doesn't exist yet
        const balance = await prisma.balance.upsert({
            where: { id: 1 },
            update: {},
            create: { id: 1, amount: 0 },
        });
        return NextResponse.json(balance);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { amount } = await request.json();

        const balance = await prisma.balance.upsert({
            where: { id: 1 },
            update: { amount: parseFloat(amount) },
            create: { id: 1, amount: parseFloat(amount) },
        });

        return NextResponse.json(balance);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

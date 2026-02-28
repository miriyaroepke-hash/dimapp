import prisma from '@/lib/prisma';
import CreditsClient from './CreditsClient';

export default async function CreditsPage() {
    const [credits, balance] = await Promise.all([
        prisma.credit.findMany({ orderBy: { createdAt: 'desc' } }),
        prisma.balance.upsert({
            where: { id: 1 },
            update: {},
            create: { id: 1, amount: 0 },
        }),
    ]);

    return <CreditsClient credits={credits} balance={balance.amount} />;
}

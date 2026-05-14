import prisma from "@/lib/prisma";
import TicketsClient from "./TicketsClient";

export default async function TicketsAdminPage() {
    const tickets = await prisma.ticket.findMany({
        include: {
            customer: true,
            messages: {
                orderBy: { createdAt: 'asc' }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });

    return <TicketsClient tickets={tickets} />;
}

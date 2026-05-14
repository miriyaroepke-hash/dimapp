import prisma from "@/lib/prisma";
import WebsiteOrdersClient from "./WebsiteOrdersClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

export default async function WebsiteOrdersPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || "USER";

    // Restrict access if needed (e.g., only ADMIN or MANAGER can see this)
    if (userRole === "COURIER") {
        redirect("/daily-plan");
    }

    const unconfirmedOrders = await prisma.order.findMany({
        where: {
            source: "WEBSITE",
            status: "PENDING_CONFIRMATION"
        },
        include: { items: true },
        orderBy: { createdAt: "desc" }
    });

    const tickets = await prisma.ticket.findMany({
        include: {
            customer: true,
            messages: {
                orderBy: { createdAt: 'asc' }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });

    return <WebsiteOrdersClient orders={unconfirmedOrders} tickets={tickets} />;
}


import prisma from "@/lib/prisma";
import DailyPlanClient from "./DailyPlanClient";

export default async function DailyPlanPage() {
    const activeOrders = await prisma.order.findMany({
        where: {
            status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
            // Removed createdAt filter to show all active orders
        },
        include: { items: true },
        orderBy: { createdAt: "desc" }
    });

    return <DailyPlanClient orders={activeOrders} />;
}

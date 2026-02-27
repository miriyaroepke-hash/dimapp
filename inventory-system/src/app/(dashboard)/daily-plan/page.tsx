
import prisma from "@/lib/prisma";
import DailyPlanClient from "./DailyPlanClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export default async function DailyPlanPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || "USER";

    const whereClause: any = {
        status: { in: ["PENDING", "PROCESSING", "COMPLETED", "READY_FOR_PICKUP"] }
    };

    if (userRole === "COURIER") {
        whereClause.deliveryMethod = "ALMATY_COURIER";
    }

    const activeOrders = await prisma.order.findMany({
        where: whereClause,
        include: { items: true },
        orderBy: { createdAt: "desc" }
    });

    return <DailyPlanClient orders={activeOrders} />;
}

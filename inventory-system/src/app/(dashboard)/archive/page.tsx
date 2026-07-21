import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import ArchiveClient from "./ArchiveClient";

export default async function ArchivePage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || "USER";

    const whereClause: any = {};

    if (userRole === "COURIER") {
        whereClause.deliveryMethod = "ALMATY_COURIER";
    }

    const archivedOrders = await prisma.order.findMany({
        where: whereClause,
        include: { items: true, history: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
        take: 300
    });

    return <ArchiveClient orders={archivedOrders} />;
}

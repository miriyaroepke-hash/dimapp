import prisma from "@/lib/prisma";
import HalykClient from "./HalykClient";

export const dynamic = "force-dynamic";

export default async function HalykPage() {
    const orders = await prisma.order.findMany({
        where: {
            source: "HALYK",
            status: { notIn: ["ARCHIVED", "CANCELLED", "COMPLETED"] }
        },
        include: {
            items: true
        },
        orderBy: {
            createdAt: "desc"
        },
        take: 100
    });

    return <HalykClient orders={orders} />;
}

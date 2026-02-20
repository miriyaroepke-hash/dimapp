
import prisma from "@/lib/prisma";
import KaspiClient from "./KaspiClient";

export const dynamic = "force-dynamic";

export default async function KaspiPage() {
    const orders = await prisma.order.findMany({
        where: {
            source: "KASPI",
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

    return <KaspiClient orders={orders} />;
}


import prisma from "@/lib/prisma";
import KaspiStockClient from "./KaspiStockClient";

export default async function KaspiStockPage() {
    // Load all local products that have kaspiSku set
    const localProducts = await prisma.product.findMany({
        select: {
            id: true,
            name: true,
            size: true,
            kaspiSku: true,
            sku: true,
            quantity: true,
            preOrderDays: true,
        },

        orderBy: { name: "asc" },
    });

    return <KaspiStockClient localProducts={localProducts} />;
}

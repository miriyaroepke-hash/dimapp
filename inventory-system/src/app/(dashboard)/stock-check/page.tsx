import prisma from "@/lib/prisma";
import StockCheck from "@/components/StockCheck";

export default async function StockCheckPage() {
    // Fetch all products with positive stock for the system baseline
    const systemStock = await prisma.product.findMany({
        where: { quantity: { gt: 0 } },
        orderBy: { name: "asc" }
    });

    return (
        <div className="h-full">
            <h1 className="text-2xl font-bold mb-4">Инвентаризация</h1>
            <StockCheck systemStock={systemStock} />
        </div>
    );
}

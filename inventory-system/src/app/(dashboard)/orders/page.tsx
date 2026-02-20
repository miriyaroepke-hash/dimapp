import prisma from "@/lib/prisma";
import CreateOrderClient from "./CreateOrderClient";
import OrdersClient from "./OrdersClient";

export default async function OrdersPage() {
    const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            items: true,
            history: {
                orderBy: { createdAt: "desc" }
            }
        },
    });

    const products = await prisma.product.findMany({
        orderBy: { name: "asc" }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Заказы</h1>
                <CreateOrderClient products={products} />
            </div>

            <OrdersClient orders={orders} products={products} />
        </div>
    );
}

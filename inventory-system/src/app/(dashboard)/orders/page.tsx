import prisma from "@/lib/prisma";
import CreateOrderClient from "./CreateOrderClient";
import OrdersClient from "./OrdersClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export default async function OrdersPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || "USER";

    const whereClause: any = {};
    if (userRole === "COURIER") {
        whereClause.deliveryMethod = "ALMATY_COURIER";
    }

    const orders = await prisma.order.findMany({
        where: whereClause,
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

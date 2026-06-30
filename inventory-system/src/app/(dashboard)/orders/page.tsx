import prisma from "@/lib/prisma";
import CreateOrderClient from "./CreateOrderClient";
import OrdersClient from "./OrdersClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; perPage?: string }>;
}) {
    const { q, page: pageStr, perPage } = await searchParams;
    const query = q || "";
    const page = Number(pageStr) || 1;
    const limit = Number(perPage) || 50;
    const skip = (page - 1) * limit;

    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || "USER";

    const whereClause: any = {
        source: { not: "KASPI" },
        status: { notIn: ["COMPLETED", "CANCELLED", "ARCHIVED", "RETURNED"] }
    };

    if (userRole === "COURIER") {
        whereClause.deliveryMethod = "ALMATY_COURIER";
    }

    if (query) {
        whereClause.AND = [
            {
                OR: [
                    { orderNumber: { contains: query, mode: "insensitive" } },
                    { clientName: { contains: query, mode: "insensitive" } },
                    { clientPhone: { contains: query, mode: "insensitive" } },
                ]
            }
        ];
    }

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
            include: {
                items: true,
                history: {
                    orderBy: { createdAt: "desc" }
                }
            },
        }),
        prisma.order.count({ where: whereClause })
    ]);

    const products = await prisma.product.findMany({
        where: { quantity: { gt: 0 } },
        select: {
            id: true,
            name: true,
            sku: true,
            size: true,
            price: true,
            quantity: true,
            image: true,
        }
    });

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Заказы</h1>
                <CreateOrderClient />
            </div>

            <OrdersClient 
                orders={orders} 
                products={products} 
                total={total}
                currentPage={page}
                totalPages={totalPages}
            />
        </div>
    );
}

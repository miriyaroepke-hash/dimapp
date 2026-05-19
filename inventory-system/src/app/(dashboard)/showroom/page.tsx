import prisma from "@/lib/prisma";
import ShowroomClient from "./ShowroomClient";

export default async function ShowroomPage() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch items that require transfer from showroom to warehouse
    const transferTasks = await prisma.orderItem.findMany({
        where: {
            requiresTransfer: true,
            order: {
                status: {
                    notIn: ["CANCELLED", "RETURNED"]
                },
                createdAt: {
                    gte: thirtyDaysAgo
                }
            }
        },
        include: {
            order: true,
            product: true
        },
        orderBy: {
            order: {
                createdAt: "desc"
            }
        }
    });

    // Formatting for the client
    const pendingTransfers = transferTasks.map(item => ({
        id: item.id,
        orderId: item.order.id,
        orderNumber: item.order.orderNumber,
        productName: item.name,
        productSize: item.size,
        productSku: item.product?.sku || item.sku,
        image: item.image || item.product?.image || null,
        quantity: item.quantity,
        isTransferred: item.isTransferred,
        date: item.order.createdAt.toISOString() // pass as string for client component props
    }));

    // Group by date (DD.MM.YYYY)
    const groupedTransfers: Record<string, typeof pendingTransfers> = {};
    for (const task of pendingTransfers) {
        const dateObj = new Date(task.date);
        const dateKey = dateObj.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        if (!groupedTransfers[dateKey]) {
            groupedTransfers[dateKey] = [];
        }
        groupedTransfers[dateKey].push(task);
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Шоурум</h1>
            <p className="text-gray-500">
                Управление оффлайн-продажами и передачей товаров на доставку.
            </p>
            
            <ShowroomClient groupedTransfers={groupedTransfers} />
        </div>
    );
}

import prisma from "@/lib/prisma";
import ShowroomClient from "./ShowroomClient";

export default async function ShowroomPage() {
    // Fetch items that require transfer from showroom to warehouse
    const transferTasks = await prisma.orderItem.findMany({
        where: {
            requiresTransfer: true,
            order: {
                status: {
                    in: ["PENDING", "PROCESSING"]
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
        quantity: item.quantity,
        date: item.order.createdAt
    }));

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Шоурум</h1>
            <p className="text-gray-500">
                Управление оффлайн-продажами и передачей товаров на доставку.
            </p>
            
            <ShowroomClient pendingTransfers={pendingTransfers} />
        </div>
    );
}

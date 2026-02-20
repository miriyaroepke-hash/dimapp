
import prisma from "@/lib/prisma";
import { format } from "date-fns";

export default async function ArchivePage() {
    const archivedOrders = await prisma.order.findMany({
        where: {
            status: "ARCHIVED"
        },
        include: { items: true },
        orderBy: { updatedAt: "desc" },
        take: 100 // Limit to last 100 orders for performance
    });

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Архив Заказов</h1>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3">Дата</th>
                            <th className="px-6 py-3">Номер</th>
                            <th className="px-6 py-3">Клиент</th>
                            <th className="px-6 py-3">Товары</th>
                            <th className="px-6 py-3 text-right">Сумма</th>
                        </tr>
                    </thead>
                    <tbody>
                        {archivedOrders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    Архив пуст
                                </td>
                            </tr>
                        ) : (
                            archivedOrders.map((order: any) => (
                                <tr key={order.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        {format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}
                                    </td>
                                    <td className="px-6 py-4 font-medium">{order.orderNumber}</td>
                                    <td className="px-6 py-4">
                                        <div>{order.clientName || "-"}</div>
                                        <div className="text-xs text-gray-500">{order.clientPhone}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {order.items.map((item: any, idx: number) => (
                                                <div key={idx} className="text-xs">
                                                    {item.name} ({item.size}) x{item.quantity}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold w-32">
                                        ₸ {order.totalAmount}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

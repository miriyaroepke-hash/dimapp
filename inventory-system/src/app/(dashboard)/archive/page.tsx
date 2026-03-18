
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export default async function ArchivePage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || "USER";

    // Show all non-empty orders since the user treats Archive as a complete sales ledger
    const whereClause: any = {};

    if (userRole === "COURIER") {
        whereClause.deliveryMethod = "ALMATY_COURIER";
    }

    const archivedOrders = await prisma.order.findMany({
        where: whereClause,
        include: { items: true },
        orderBy: { createdAt: "desc" }, // Sort by creation date (deduction date) rather than randomly jumping up on status change
        take: 300
    });

    function getSourceBadge(source: string) {
        if (source === "KASPI") {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    📦 Kaspi
                </span>
            );
        }
        if (source === "WEBSITE") {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    🌐 Сайт
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                🏪 Магазин
            </span>
        );
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case "PENDING": return <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded text-xs">В обработке</span>;
            case "SHIPPED": return <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">В пути</span>;
            case "READY_FOR_PICKUP": return <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded text-xs">Ждет выдачи</span>;
            case "DELIVERING": return <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs">Доставляется</span>;
            case "COMPLETED": 
            case "ARCHIVED": return <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">Завершен</span>;
            case "CANCELLED": return <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs">Отменен</span>;
            case "RETURNED": return <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded text-xs">Возврат</span>;
            default: return <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs">{status}</span>;
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Архив Заказов</h1>
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                    {archivedOrders.length} заказов
                </span>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3">Дата</th>
                            <th className="px-4 py-3">Номер</th>
                            <th className="px-4 py-3">Статус</th>
                            <th className="px-4 py-3">Источник</th>
                            <th className="px-4 py-3">Клиент</th>
                            <th className="px-4 py-3">Товары</th>
                            <th className="px-4 py-3">Примечание</th>
                            <th className="px-4 py-3 text-right">Сумма</th>
                        </tr>
                    </thead>
                    <tbody>
                        {archivedOrders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    Архив пуст
                                </td>
                            </tr>
                        ) : (
                            archivedOrders.map((order: any) => (
                                <tr key={order.id} className={`bg-white border-b hover:bg-gray-50 ${order.source === "KASPI" ? "border-l-4 border-l-red-400" : ""}`}>
                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                        {format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{order.orderNumber}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {getStatusBadge(order.status)}
                                    </td>
                                    <td className="px-4 py-3">
                                        {getSourceBadge(order.source || "POS")}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>{order.clientName || "—"}</div>
                                        <div className="text-xs text-gray-400">{order.clientPhone}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-0.5">
                                            {order.items.map((item: any, idx: number) => (
                                                <div key={idx} className="text-xs text-gray-700">
                                                    {item.name}
                                                    {item.size && <span className="text-gray-400"> ({item.size})</span>}
                                                    <span className="text-gray-500"> ×{item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 max-w-xs">
                                        {order.comment ? (
                                            <div className="text-xs text-gray-500 italic">{order.comment}</div>
                                        ) : (
                                            <span className="text-gray-300 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold w-28">
                                        ₸ {order.totalAmount.toLocaleString()}
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

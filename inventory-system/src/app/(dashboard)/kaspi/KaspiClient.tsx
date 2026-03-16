
"use client";

import { useState, useEffect } from "react";
import { syncKaspiOrders, getKaspiLabelUrl } from "@/app/actions";
import { RefreshCw, Download, ExternalLink, FileText, Upload } from "lucide-react";
import { format } from "date-fns";

type Order = {
    id: number;
    orderNumber: string;
    clientName: string | null;
    status: string;
    totalAmount: number;
    comment: string | null;
    source: string;
    createdAt: Date;
    items: {
        id: number;
        name: string;
        quantity: number;
        size: string | null;
        sku: string | null;
    }[];
};

export default function KaspiClient({ orders }: { orders: Order[] }) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await syncKaspiOrders();
            if (res.error) {
                alert(res.error);
            } else {
                alert(`Синхронизация завершена! Добавлено: ${res.added}`);
                window.location.reload();
            }
        } catch (e) {
            alert("Ошибка при синхронизации");
        } finally {
            setIsSyncing(false);
        }
    };

    const handlePushStock = async () => {
        setIsPushing(true);
        try {
            const res = await fetch("/api/kaspi/push-stock", { method: "POST" });
            const data = await res.json();
            if (!res.ok || data.error) {
                alert(`Ошибка: ${data.error || "Не удалось обновить остатки"}`);
            } else {
                alert(data.message || `Обновлено: ${data.updated} товаров`);
            }
        } catch (e) {
            alert("Ошибка при отправке остатков в Kaspi");
        } finally {
            setIsPushing(false);
        }
    };

    const handlePrintLabel = async (orderId: number) => {
        const res = await getKaspiLabelUrl(orderId.toString());
        if (res.error) {
            alert(res.error);
        } else if (res.url) {
            window.open(res.url, "_blank");
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: "bg-yellow-100 text-yellow-800",
            READY_FOR_PICKUP: "bg-blue-100 text-blue-800",
            COMPLETED: "bg-green-100 text-green-800",
            ARCHIVED: "bg-green-100 text-green-800",
            CANCELLED: "bg-red-100 text-red-800",
            RETURNED: "bg-red-100 text-red-800",
            SHIPPED: "bg-purple-100 text-purple-800",
        };
        const labels: Record<string, string> = {
            PENDING: "Новый",
            READY_FOR_PICKUP: "На сборку",
            COMPLETED: "Завершен",
            ARCHIVED: "Архив",
            CANCELLED: "Отменен",
            RETURNED: "Возврат",
            SHIPPED: "В доставке",
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || "bg-gray-100"}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold">Заказы Kaspi</h1>
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                        Всего: {orders.length}
                    </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {/* Push current stock levels to Kaspi */}
                    <button
                        onClick={handlePushStock}
                        disabled={isPushing}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                        <Upload className={`w-4 h-4 ${isPushing ? "animate-bounce" : ""}`} />
                        {isPushing ? "Отправка..." : "Обновить остатки в Kaspi"}
                    </button>
                    {/* Pull new orders from Kaspi */}
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                        {isSyncing ? "Загрузка..." : "Синхронизировать заказы"}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3">№ Заказа</th>
                            <th className="px-6 py-3">Дата</th>
                            <th className="px-6 py-3">Клиент</th>
                            <th className="px-6 py-3">Товары</th>
                            <th className="px-6 py-3">Статус</th>
                            <th className="px-6 py-3">Сумма</th>
                            <th className="px-6 py-3 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    Нет активных заказов. Нажмите &quot;Синхронизировать заказы&quot;.
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{order.orderNumber}</div>
                                        {order.source === "KASPI" && (
                                            <span className="text-xs text-red-600 font-medium">📦 Kaspi</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>{order.clientName || "Не указан"}</div>
                                        {order.comment && (
                                            <div className="text-xs text-gray-400 mt-0.5">{order.comment}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{item.name}</span>
                                                    {item.size && (
                                                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                                            Размер: {item.size}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-400">
                                                        {item.quantity} шт. {item.sku ? `(SKU: ${item.sku})` : ""}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(order.status)}
                                    </td>
                                    <td className="px-6 py-4 font-bold">
                                        {order.totalAmount.toLocaleString()} ₸
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handlePrintLabel(order.id)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Сформировать накладную"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </button>
                                            <a
                                                href={`https://kaspi.kz/merchant/orders/view/${order.orderNumber}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Открыть в Kaspi"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* XML Feed info */}
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <h2 className="text-xl font-bold border-b pb-2">Интеграция</h2>
                <div className="p-4 border rounded bg-gray-50">
                    <h3 className="font-bold mb-2">XML Feed для Kaspi</h3>
                    <p className="text-sm text-gray-500 mb-2">
                        Kaspi читает этот фид и периодически обновляет остатки. Для немедленного обновления нажмите &quot;Обновить остатки в Kaspi&quot;.
                    </p>
                    <div className="flex items-center gap-2 bg-white p-2 border rounded">
                        <code className="text-sm flex-1 text-gray-600 overflow-hidden text-ellipsis">
                            {origin ? `${origin}/api/kaspi/feed` : '/api/kaspi/feed'}
                        </code>
                        <a
                            href="/api/kaspi/feed"
                            target="_blank"
                            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm transition-colors"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Открыть
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

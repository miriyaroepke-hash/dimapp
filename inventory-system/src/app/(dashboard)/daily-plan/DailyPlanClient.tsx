"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { Download, Check, X } from "lucide-react";
import { updateOrderStatus, generateCdekPrintUrl } from "@/app/actions";
import { Loader2, Printer } from "lucide-react";


interface OrderItem {
    id: number;
    name: string;
    quantity: number;
    size?: string | null;
}

interface Order {
    id: number;
    orderNumber: string;
    clientName: string | null;
    clientPhone: string | null;
    address: string | null;
    city: string | null;
    deliveryMethod: string;
    paymentMethod: string;
    codAmount: number | null;
    totalAmount: number;
    createdAt: Date;
    items: OrderItem[];
    trackingNumber?: string | null;
}

import { createCdekOrder } from "@/app/actions";

export default function DailyPlanClient({ orders, kaspiCount = 0 }: { orders: Order[], kaspiCount?: number }) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isPrinting, setIsPrinting] = useState(false);

    // Sorting & Filtering State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: "asc" | "desc" } | null>(null);
    const [filters, setFilters] = useState({
        deliveryMethod: "",
        orderNumber: "",
        client: "",
        address: "",
        items: "",
        payment: "",
        totalAmount: ""
    });

    const handleSort = (key: string) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const processedOrders = useMemo(() => {
        let result = [...orders];

        // 1. Filter
        if (filters.deliveryMethod) {
            result = result.filter(o => getCourierLabel(o.deliveryMethod).toLowerCase().includes(filters.deliveryMethod.toLowerCase()));
        }
        if (filters.orderNumber) {
            result = result.filter(o => o.orderNumber.toLowerCase().includes(filters.orderNumber.toLowerCase()));
        }
        if (filters.client) {
            const term = filters.client.toLowerCase();
            result = result.filter(o =>
                (o.clientName && o.clientName.toLowerCase().includes(term)) ||
                (o.clientPhone && o.clientPhone.toLowerCase().includes(term))
            );
        }
        if (filters.address) {
            const term = filters.address.toLowerCase();
            result = result.filter(o => {
                const anyO = o as any;
                return (o.city && o.city.toLowerCase().includes(term)) ||
                    (o.address && o.address.toLowerCase().includes(term)) ||
                    (anyO.street && anyO.street.toLowerCase().includes(term));
            });
        }
        if (filters.items) {
            const term = filters.items.toLowerCase();
            result = result.filter(o =>
                o.items.some(i => i.name.toLowerCase().includes(term) || (i.size && i.size.toLowerCase().includes(term)))
            );
        }
        if (filters.payment) {
            const term = filters.payment.toLowerCase();
            result = result.filter(o => o.paymentMethod.toLowerCase().includes(term));
        }
        if (filters.totalAmount) {
            result = result.filter(o => o.totalAmount.toString().includes(filters.totalAmount));
        }

        // 2. Sort
        if (sortConfig) {
            result.sort((a, b) => {
                let aVal: any = a[sortConfig.key as keyof Order];
                let bVal: any = b[sortConfig.key as keyof Order];

                // Special handling for nested or computed keys
                if (sortConfig.key === "client") {
                    aVal = a.clientName || "";
                    bVal = b.clientName || "";
                } else if (sortConfig.key === "address") {
                    aVal = `${a.city || ""} ${a.address || ""}`;
                    bVal = `${b.city || ""} ${b.address || ""}`;
                } else if (sortConfig.key === "deliveryMethod") {
                    aVal = getCourierLabel(a.deliveryMethod);
                    bVal = getCourierLabel(b.deliveryMethod);
                } else if (sortConfig.key === "items") {
                    aVal = a.items.length;
                    bVal = b.items.length;
                } else if (sortConfig.key === "payment") {
                    aVal = a.paymentMethod;
                    bVal = b.paymentMethod;
                }

                if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [orders, filters, sortConfig]);

    function getCourierLabel(method: string) {
        switch (method) {
            case "CDEK": return "СДЭК";
            case "ALMATY_COURIER": return "Курьер по Алматы";
            case "RIKA": return "Рика";
            case "POST": return "Почта";
            case "YANDEX": return "Яндекс";
            case "KASPI": return "Kaspi";
            case "PICKUP": return "Самовывоз";
            default: return method;
        }
    }

    const handlePrintCdek = async () => {
        if (selectedIds.length === 0) return;
        setIsPrinting(true);
        try {
            const res = await generateCdekPrintUrl(selectedIds);
            if (res.error) {
                alert(res.error);
            } else if (res.taskUuid) {
                window.open(`/api/cdek/print/${res.taskUuid}`, '_blank');
            }
        } catch (e) {
            alert("Ошибка при печати");
        } finally {
            setIsPrinting(false);
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === orders.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(orders.map(o => o.id));
        }
    };

    const handleExport = () => {
        const ordersToExport = orders.filter(o => selectedIds.includes(o.id));

        if (ordersToExport.length === 0) {
            alert("Выберите заказы для экспорта");
            return;
        }

        const data = ordersToExport.map(o => ({
            "Курьер": getCourierLabel(o.deliveryMethod),
            "Номер заказа": o.orderNumber,
            "Время": format(new Date(o.createdAt), "HH:mm"),
            "Клиент": o.clientName,
            "Телефон": o.clientPhone,
            "Адрес": `${o.city || ""} ${o.address || ""}`.trim(),
            "Товары": o.items.map(i => `${i.name} (${i.size || "-"}) x${i.quantity}`).join(", "),
            "Оплата": o.paymentMethod,
            "Наложка": o.codAmount || 0,
            "Сумма": o.totalAmount
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Заказы");
        XLSX.writeFile(wb, `План_дня_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`);
    };

    const handleArchive = async () => {
        if (selectedIds.length === 0) return;

        if (confirm(`Вы уверены, что хотите отправить ${selectedIds.length} заказов в архив?`)) {
            const result = await updateOrderStatus(selectedIds, "ARCHIVED");
            if (result.success) {
                setSelectedIds([]);
            } else {
                alert("Ошибка при архивации");
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow">
                <div className="flex flex-wrap items-center gap-4">
                    <h1 className="text-2xl font-bold">План Дня</h1>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                        Всего: {orders.length}
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                        Выбрано: {selectedIds.length}
                    </span>
                    {kaspiCount > 0 && (
                        <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 animate-pulse cursor-pointer shadow-sm hover:scale-105 transition-transform" onClick={() => window.location.href = '/kaspi'}>
                            <span>📦</span>
                            Новых заказов Kaspi: {kaspiCount}
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button
                        onClick={handlePrintCdek}
                        disabled={selectedIds.length === 0 || isPrinting}
                        className="flex-1 md:flex-none justify-center items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex"
                    >
                        {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        Печать СДЭК
                    </button>
                    <button
                        onClick={() => {
                            if (selectedIds.length === 0) return;
                            window.open(`/kazpost/print?ids=${selectedIds.join(',')}`, '_blank');
                        }}
                        disabled={selectedIds.length === 0}
                        className="flex-1 md:flex-none justify-center items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex"
                    >
                        <Printer className="w-4 h-4" />
                        Печать Казпочта
                    </button>
                    <button
                        onClick={handleArchive}
                        disabled={selectedIds.length === 0}
                        className="flex-1 md:flex-none justify-center items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex"
                    >
                        <Check className="w-4 h-4" />
                        В архив
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={selectedIds.length === 0}
                        className="flex-1 md:flex-none justify-center items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex"
                    >
                        <Download className="w-4 h-4" />
                        Скачать Excel
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th scope="col" className="p-4 w-4" rowSpan={2}>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                            checked={orders.length > 0 && selectedIds.length === orders.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-2 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("deliveryMethod")}>
                                    Курьер {sortConfig?.key === "deliveryMethod" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th scope="col" className="px-6 py-2 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("orderNumber")}>
                                    Заказ / Время {sortConfig?.key === "orderNumber" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th scope="col" className="px-6 py-2 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("client")}>
                                    Клиент {sortConfig?.key === "client" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th scope="col" className="px-6 py-2 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("address")}>
                                    Адрес {sortConfig?.key === "address" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th scope="col" className="px-6 py-2 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("items")}>
                                    Товары {sortConfig?.key === "items" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th scope="col" className="px-6 py-2 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("payment")}>
                                    Оплата {sortConfig?.key === "payment" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th scope="col" className="px-6 py-2 cursor-pointer hover:bg-gray-200 text-right" onClick={() => handleSort("totalAmount")}>
                                    Сумма {sortConfig?.key === "totalAmount" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                                </th>
                            </tr>
                            <tr className="bg-white border-b">
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="Фильтр..." className="w-full text-xs p-1 border rounded font-normal"
                                        value={filters.deliveryMethod} onChange={(e) => setFilters(f => ({ ...f, deliveryMethod: e.target.value }))} />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="Номер..." className="w-full text-xs p-1 border rounded font-normal"
                                        value={filters.orderNumber} onChange={(e) => setFilters(f => ({ ...f, orderNumber: e.target.value }))} />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="Имя/Тел..." className="w-full text-xs p-1 border rounded font-normal"
                                        value={filters.client} onChange={(e) => setFilters(f => ({ ...f, client: e.target.value }))} />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="Где..." className="w-full text-xs p-1 border rounded font-normal"
                                        value={filters.address} onChange={(e) => setFilters(f => ({ ...f, address: e.target.value }))} />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="Товар..." className="w-full text-xs p-1 border rounded font-normal"
                                        value={filters.items} onChange={(e) => setFilters(f => ({ ...f, items: e.target.value }))} />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="Способ..." className="w-full text-xs p-1 border rounded font-normal"
                                        value={filters.payment} onChange={(e) => setFilters(f => ({ ...f, payment: e.target.value }))} />
                                </th>
                                <th className="px-2 py-2">
                                    <input type="text" placeholder="Сумма..." className="w-full text-xs p-1 border rounded font-normal text-right"
                                        value={filters.totalAmount} onChange={(e) => setFilters(f => ({ ...f, totalAmount: e.target.value }))} />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                        Нет активных заказов на сегодня, удовлетворяющих фильтрам
                                    </td>
                                </tr>
                            ) : (
                                processedOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className={`bg-white border-b hover:bg-gray-50 ${selectedIds.includes(order.id) ? 'bg-blue-50' : ''}`}
                                        onClick={() => toggleSelect(order.id)}
                                    >
                                        <td className="w-4 p-4">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                                                    checked={selectedIds.includes(order.id)}
                                                    readOnly
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold
                                                ${order.deliveryMethod === 'CDEK' ? 'bg-green-100 text-green-800' :
                                                    order.deliveryMethod === 'YANDEX' ? 'bg-yellow-100 text-yellow-800' :
                                                        order.deliveryMethod === 'PICKUP' ? 'bg-gray-100 text-gray-800' :
                                                            'bg-blue-100 text-blue-800'}`}>
                                                {getCourierLabel(order.deliveryMethod)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold">{order.orderNumber}</div>
                                            <div className="text-xs text-gray-500">{format(new Date(order.createdAt), "HH:mm")}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{order.clientName || "-"}</div>
                                            <div className="text-xs text-gray-500">{order.clientPhone}</div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs truncate" title={`${order.city || ""} ${order.address || ""}`}>
                                            {order.city} {order.address}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="text-xs border-b border-dashed last:border-0 pb-1 last:pb-0">
                                                        {item.name} <span className="text-gray-500">({item.size}) x{item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {order.deliveryMethod === 'CDEK' && (
                                                <div className="mt-2">
                                                    {order.trackingNumber ? (
                                                        <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                                                            CDEK: {order.trackingNumber}
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (!confirm("Создать накладную СДЭК?")) return;
                                                                // Ideally use a toast or loading state here
                                                                const res = await createCdekOrder(order.id);
                                                                if (res.error) alert(res.error);
                                                            }}
                                                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                                        >
                                                            Создать накладную
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {order.deliveryMethod === 'POST' && (
                                                <div className="mt-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(`/kazpost/print?ids=${order.id}`, '_blank');
                                                        }}
                                                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center gap-1 w-fit"
                                                    >
                                                        <Printer className="w-3 h-3" />
                                                        Печать бланка
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs">
                                                {order.paymentMethod}
                                                {order.codAmount ? <div className="text-red-500 font-bold">Наложка: {order.codAmount}</div> : null}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            ₸ {order.totalAmount}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Edit, Check, X, Truck } from "lucide-react";
import { updateOrder, updateOrderStatus, createCdekOrder, updateCdekStatus } from "@/app/actions";
import EditOrderModal from "@/components/EditOrderModal";

interface Product {
    id: number;
    name: string;
    sku: string;
    size: string | null;
    price: number;
    quantity: number;
    image?: string | null;
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
    status: string;
    paymentStatus?: string | null;
    createdAt: Date;
    trackingNumber?: string | null;
    items: any[];
    history: any[];
}

export default function OrdersClient({ orders, products }: { orders: Order[], products: Product[] }) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);

    // Editing State Removed from here (moved to modal)

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

    const startEdit = (order: Order) => {
        setEditingOrder(order);
    };

    const handleCreateCdek = async (id: number) => {
        if (!confirm("Создать накладную СДЭК?")) return;
        const res = await createCdekOrder(id);
        if (res.error) alert(res.error);
    };

    const handleUpdateStatus = async (id: number) => {
        const res = await updateCdekStatus(id);
        if (res.error) alert(res.error);
        else if (res.message) alert(res.message);
    };

    const filteredOrders = orders.filter(o =>
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
                <input
                    type="text"
                    placeholder="Поиск заказа..."
                    className="border px-4 py-2 rounded"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <div className="text-sm text-gray-500">
                    Найдено: {filteredOrders.length}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 uppercase text-xs">
                        <tr>
                            <th className="p-4 w-4">
                                <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === orders.length && orders.length > 0} />
                            </th>
                            <th className="px-6 py-3">Номер / Дата</th>
                            <th className="px-6 py-3">Клиент</th>
                            <th className="px-6 py-3">Доставка / Трек</th>
                            <th className="px-6 py-3">Сумма</th>
                            <th className="px-6 py-3">Статус</th>
                            <th className="px-6 py-3">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order.id} className="border-b hover:bg-gray-50">
                                <td className="p-4">
                                    <input type="checkbox" checked={selectedIds.includes(order.id)} onChange={() => toggleSelect(order.id)} />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold">{order.orderNumber}</div>
                                    <div className="text-gray-500 text-xs">{format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}</div>
                                    {/* History Preview */}
                                    {order.history.length > 0 && (
                                        <div className="text-[10px] text-gray-400 mt-1">
                                            Изм: {format(new Date(order.history[order.history.length - 1].createdAt), "HH:mm")}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium">{order.clientName || "-"}</div>
                                    <div className="text-xs text-gray-500">{order.clientPhone}</div>
                                    <div className="text-xs text-gray-400 truncate max-w-[150px]">{order.city} {order.address}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div>{order.deliveryMethod}</div>
                                    {order.trackingNumber ? (
                                        <button onClick={() => handleUpdateStatus(order.id)} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded inline-block mt-1 font-mono hover:bg-green-200">
                                            {order.trackingNumber}
                                        </button>
                                    ) : (
                                        order.deliveryMethod === 'CDEK' && (
                                            <button onClick={() => handleCreateCdek(order.id)} className="text-xs text-blue-600 hover:underline mt-1">
                                                + Накладная
                                            </button>
                                        )
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold">₸ {order.totalAmount}</div>
                                    <div className={`mt-1 inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold 
                                        ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 
                                          order.paymentStatus === 'FAILED' ? 'bg-red-100 text-red-700' : 
                                          'bg-yellow-100 text-yellow-700'}`}
                                    >
                                        {order.paymentStatus || "PENDING"}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 flex gap-2">
                                    <button onClick={() => startEdit(order)} className="p-1 hover:bg-gray-200 rounded">
                                        <Edit className="w-4 h-4 text-gray-600" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingOrder && (
                <EditOrderModal
                    order={editingOrder}
                    products={products}
                    onClose={() => setEditingOrder(null)}
                />
            )}
        </div>
    );
}

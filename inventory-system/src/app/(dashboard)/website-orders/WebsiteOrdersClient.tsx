"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check, MessageCircle, Clock, Truck, CreditCard, XCircle } from "lucide-react";
import { confirmWebsiteOrder, cancelWebsiteOrder } from "./actions";

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
    totalAmount: number;
    createdAt: Date;
    items: OrderItem[];
}

export default function WebsiteOrdersClient({ orders }: { orders: Order[] }) {
    const [isConfirming, setIsConfirming] = useState<number | null>(null);
    const [isCancelling, setIsCancelling] = useState<number | null>(null);

    const handleConfirm = async (id: number) => {
        if (!confirm("Подтвердить заказ? Он будет отправлен в 'План дня'.")) return;
        
        setIsConfirming(id);
        const res = await confirmWebsiteOrder(id);
        if (!res.success) {
            alert(res.error || "Ошибка при подтверждении");
        }
        setIsConfirming(null);
    };

    const handleCancel = async (id: number) => {
        if (!confirm("Вы уверены, что хотите отменить этот заказ? Списанные вещи вернутся на склад.")) return;
        
        setIsCancelling(id);
        const res = await cancelWebsiteOrder(id);
        if (!res.success) {
            alert(res.error || "Ошибка при отмене");
        }
        setIsCancelling(null);
    };

    const handleWhatsApp = (phone: string | null, orderNumber: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, "");
        const text = encodeURIComponent(`Здравствуйте! Это магазин Dimmiani. Пишу вам по поводу вашего заказа ${orderNumber}. `);
        window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Заказы с сайта (Неподтвержденные)</h1>
                    <p className="text-gray-500 text-sm mt-1">Эти заказы ожидают вашего подтверждения, прежде чем попадут в План Дня.</p>
                </div>
                <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold">
                    Ожидают: {orders.length}
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="bg-white p-12 rounded-lg shadow text-center border border-gray-200">
                    <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700">Нет новых заказов с сайта</h3>
                    <p className="text-gray-500 mt-2">Все заказы уже подтверждены и находятся в Плане Дня.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-shadow hover:shadow-md">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">Заказ {order.orderNumber}</h3>
                                    <p className="text-xs text-gray-500 flex items-center mt-1">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-lg text-gray-900">{order.totalAmount.toLocaleString()} ₸</div>
                                </div>
                            </div>
                            
                            <div className="p-4 flex-1 flex flex-col gap-4">
                                <div>
                                    <p className="font-semibold text-gray-900">{order.clientName || "Без имени"}</p>
                                    <p className="text-gray-600 text-sm font-mono mt-1">{order.clientPhone}</p>
                                </div>

                                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                                    <div className="flex items-start mb-2">
                                        <Truck className="w-4 h-4 text-blue-500 mr-2 mt-0.5 shrink-0" />
                                        <span className="text-gray-700">
                                            <span className="font-semibold mr-1">{order.deliveryMethod}</span> 
                                            {order.city ? `${order.city}, ` : ''}{order.address || "Нет адреса"}
                                        </span>
                                    </div>
                                    <div className="flex items-center">
                                        <CreditCard className="w-4 h-4 text-green-500 mr-2 shrink-0" />
                                        <span className="text-gray-700 font-semibold">{order.paymentMethod}</span>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Товары</p>
                                    <ul className="space-y-1">
                                        {order.items.map((item, idx) => (
                                            <li key={idx} className="text-sm flex justify-between border-b border-dashed border-gray-200 pb-1 last:border-0">
                                                <span className="text-gray-800">{item.name} <span className="text-gray-500">({item.size || "-"})</span></span>
                                                <span className="font-medium">x{item.quantity}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2 mt-auto">
                                <button 
                                    onClick={() => handleWhatsApp(order.clientPhone, order.orderNumber)}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-[#25D366] text-white rounded-lg font-medium hover:bg-[#128C7E] transition-colors text-sm"
                                    title="Написать в WhatsApp"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    WA
                                </button>
                                <button 
                                    onClick={() => handleCancel(order.id)}
                                    disabled={isCancelling === order.id || isConfirming === order.id}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors disabled:opacity-50 text-sm"
                                >
                                    {isCancelling === order.id ? (
                                        "..."
                                    ) : (
                                        <>
                                            <XCircle className="w-4 h-4" />
                                            Отмена
                                        </>
                                    )}
                                </button>
                                <button 
                                    onClick={() => handleConfirm(order.id)}
                                    disabled={isConfirming === order.id || isCancelling === order.id}
                                    className="flex-[2] flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                                >
                                    {isConfirming === order.id ? (
                                        "..."
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Подтвердить
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

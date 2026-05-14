"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check, MessageCircle, Clock, Truck, CreditCard, XCircle, MessageSquare, User, Shield, CheckCircle } from "lucide-react";
import { confirmWebsiteOrder, cancelWebsiteOrder } from "./actions";
import { replyToTicket, closeTicket } from "@/app/actions";

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

export default function WebsiteOrdersClient({ orders, tickets }: { orders: Order[], tickets: any[] }) {
    const [activeTab, setActiveTab] = useState<"orders" | "tickets">("orders");

    // Orders state
    const [isConfirming, setIsConfirming] = useState<number | null>(null);
    const [isCancelling, setIsCancelling] = useState<number | null>(null);

    // Tickets state
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

    // Order Handlers
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

    // Ticket Handlers
    const selectedTicket = tickets?.find(t => t.id === selectedTicketId);

    const handleReply = async () => {
        if (!replyContent.trim() || !selectedTicketId) return;

        setIsSubmittingTicket(true);
        try {
            const res = await replyToTicket(selectedTicketId, replyContent);
            if (res.error) {
                alert(res.error);
            } else {
                setReplyContent("");
            }
        } catch (e) {
            alert("Ошибка при отправке");
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    const handleCloseTicket = async () => {
        if (!selectedTicketId) return;
        if (!confirm("Закрыть тикет?")) return;

        setIsSubmittingTicket(true);
        try {
            const res = await closeTicket(selectedTicketId);
            if (res.error) {
                alert(res.error);
            }
        } catch (e) {
            alert("Ошибка");
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white rounded-t-lg px-4 pt-4 shadow-sm">
                <button
                    onClick={() => setActiveTab("orders")}
                    className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${
                        activeTab === "orders" 
                            ? "border-yellow-400 text-yellow-600" 
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                    Заказы с сайта
                    {orders?.length > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-yellow-800 bg-yellow-100 rounded-full">
                            {orders.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("tickets")}
                    className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${
                        activeTab === "tickets" 
                            ? "border-purple-500 text-purple-600" 
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                    Сообщения
                    {tickets?.filter(t => t.status === "OPEN").length > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-purple-500 rounded-full">
                            {tickets.filter(t => t.status === "OPEN").length}
                        </span>
                    )}
                </button>
            </div>

            {/* Orders View */}
            {activeTab === "orders" && (
                <>
                    <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Заказы (Неподтвержденные)</h1>
                            <p className="text-gray-500 text-sm mt-1">Эти заказы ожидают вашего подтверждения, прежде чем попадут в План Дня.</p>
                        </div>
                    </div>

                    {orders?.length === 0 ? (
                        <div className="bg-white p-12 rounded-lg shadow text-center border border-gray-200">
                            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-700">Нет новых заказов с сайта</h3>
                            <p className="text-gray-500 mt-2">Все заказы уже подтверждены и находятся в Плане Дня.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {orders?.map((order) => (
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
                </>
            )}

            {/* Tickets View */}
            {activeTab === "tickets" && (
                <div className="flex h-[75vh] bg-white rounded-lg shadow border overflow-hidden">
                    {/* Sidebar List */}
                    <div className="w-1/3 border-r flex flex-col bg-gray-50">
                        <div className="p-4 border-b bg-white">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-purple-600" />
                                Сообщения ({tickets?.length || 0})
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {tickets?.map(ticket => (
                                <div 
                                    key={ticket.id} 
                                    onClick={() => setSelectedTicketId(ticket.id)}
                                    className={`p-4 border-b cursor-pointer transition-colors ${selectedTicketId === ticket.id ? 'bg-purple-50 border-l-4 border-l-purple-600' : 'hover:bg-gray-100 border-l-4 border-l-transparent'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-semibold text-sm truncate pr-2">{ticket.subject}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>
                                            {ticket.status === 'OPEN' ? 'Открыт' : 'Закрыт'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 flex justify-between">
                                        <span>{ticket.customer?.firstName || ''} {ticket.customer?.phone}</span>
                                        <span>{format(new Date(ticket.updatedAt), "dd.MM HH:mm")}</span>
                                    </div>
                                </div>
                            ))}
                            {(!tickets || tickets.length === 0) && (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    Нет обращений
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col bg-white">
                        {selectedTicket ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b flex justify-between items-center bg-white shadow-sm z-10">
                                    <div>
                                        <h2 className="font-bold text-lg">{selectedTicket.subject}</h2>
                                        <div className="text-sm text-gray-500">
                                            Клиент: {selectedTicket.customer?.firstName || 'Имя не указано'} ({selectedTicket.customer?.phone})
                                        </div>
                                    </div>
                                    {selectedTicket.status === 'OPEN' && (
                                        <button 
                                            onClick={handleCloseTicket}
                                            disabled={isSubmittingTicket}
                                            className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded transition-colors"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Закрыть
                                        </button>
                                    )}
                                </div>

                                {/* Messages List */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                                    {selectedTicket.messages.map((msg: any) => {
                                        const isCustomer = msg.sender === "CUSTOMER";
                                        return (
                                            <div key={msg.id} className={`flex gap-3 ${isCustomer ? '' : 'flex-row-reverse'}`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white ${isCustomer ? 'bg-gray-400' : 'bg-purple-600'}`}>
                                                    {isCustomer ? <User className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                                </div>
                                                <div className={`max-w-[70%] rounded-lg p-3 shadow-sm ${isCustomer ? 'bg-white border text-gray-800' : 'bg-purple-100 text-purple-900'}`}>
                                                    <div className={`text-xs opacity-50 mb-1 ${isCustomer ? '' : 'text-right'}`}>
                                                        {format(new Date(msg.createdAt), "dd.MM.yyyy HH:mm")}
                                                    </div>
                                                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Reply Box */}
                                {selectedTicket.status === 'OPEN' ? (
                                    <div className="p-4 border-t bg-white">
                                        <textarea 
                                            value={replyContent}
                                            onChange={e => setReplyContent(e.target.value)}
                                            placeholder="Написать ответ клиенту..."
                                            className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                            rows={3}
                                        />
                                        <div className="flex justify-end mt-2">
                                            <button 
                                                onClick={handleReply}
                                                disabled={isSubmittingTicket || !replyContent.trim()}
                                                className="bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                            >
                                                {isSubmittingTicket ? "Отправка..." : "Отправить"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 border-t bg-gray-100 text-center text-sm text-gray-500 font-medium">
                                        Обращение закрыто. Вы не можете отправлять новые сообщения.
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                                <p>Выберите обращение слева для просмотра</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

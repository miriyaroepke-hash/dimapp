"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MessageSquare, User, Shield, CheckCircle } from "lucide-react";
import { replyToTicket, closeTicket } from "@/app/actions";

export default function TicketsClient({ tickets }: { tickets: any[] }) {
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
    const [replyContent, setReplyContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedTicket = tickets.find(t => t.id === selectedTicketId);

    const handleReply = async () => {
        if (!replyContent.trim() || !selectedTicketId) return;

        setIsSubmitting(true);
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
            setIsSubmitting(false);
        }
    };

    const handleClose = async () => {
        if (!selectedTicketId) return;
        if (!confirm("Закрыть тикет?")) return;

        setIsSubmitting(true);
        try {
            const res = await closeTicket(selectedTicketId);
            if (res.error) {
                alert(res.error);
            }
        } catch (e) {
            alert("Ошибка");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex h-[80vh] bg-white rounded-lg shadow border overflow-hidden">
            {/* Sidebar List */}
            <div className="w-1/3 border-r flex flex-col bg-gray-50">
                <div className="p-4 border-b bg-white">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                        Тикеты ({tickets.length})
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {tickets.map(ticket => (
                        <div 
                            key={ticket.id} 
                            onClick={() => setSelectedTicketId(ticket.id)}
                            className={`p-4 border-b cursor-pointer transition-colors ${selectedTicketId === ticket.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-100 border-l-4 border-l-transparent'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-semibold text-sm truncate pr-2">{ticket.subject}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>
                                    {ticket.status === 'OPEN' ? 'Открыт' : 'Закрыт'}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 flex justify-between">
                                <span>{ticket.customer?.name || ticket.customer?.phone}</span>
                                <span>{format(new Date(ticket.updatedAt), "dd.MM HH:mm")}</span>
                            </div>
                        </div>
                    ))}
                    {tickets.length === 0 && (
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
                                    Клиент: {selectedTicket.customer?.name} ({selectedTicket.customer?.phone}) • Заказов: {selectedTicket.customer?.ordersCount || 0}
                                </div>
                            </div>
                            {selectedTicket.status === 'OPEN' && (
                                <button 
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded transition-colors"
                                >
                                    <CheckCircle className="w-4 h-4" /> Закрыть
                                </button>
                            )}
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {selectedTicket.messages.map((msg: any) => {
                                const isCustomer = msg.senderType === "CUSTOMER";
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
                                                {msg.content}
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
                                        disabled={isSubmitting || !replyContent.trim()}
                                        className="bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isSubmitting ? "Отправка..." : "Отправить"}
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
    );
}

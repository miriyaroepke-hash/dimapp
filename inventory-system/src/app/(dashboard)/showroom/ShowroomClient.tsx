"use client";

import { useState, useTransition } from "react";
import CreateOrderModal from "@/components/CreateOrderModal";
import { PackageOpen, Clock, Tag, CheckCircle2, Circle } from "lucide-react";
import { toggleTransferStatus } from "./actions";

interface TransferTask {
    id: number;
    orderId: number;
    orderNumber: string;
    productName: string;
    productSize: string | null;
    productSku: string;
    quantity: number;
    date: string;
    image: string | null;
    isTransferred: boolean;
}

export default function ShowroomClient({ groupedTransfers }: { groupedTransfers: Record<string, TransferTask[]> }) {
    const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleToggleStatus = (id: number, currentStatus: boolean) => {
        startTransition(async () => {
            await toggleTransferStatus(id, !currentStatus);
        });
    };

    return (
        <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Быстрая продажа</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Оформление покупки клиента прямо в зале. Товар спишется из остатков Шоурума.
                    </p>
                </div>
                <button 
                    onClick={() => setIsQuickSaleOpen(true)}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                    <Tag className="w-5 h-5" /> Оформить продажу
                </button>
            </div>

            {/* Transfer Tasks */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                    <PackageOpen className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-gray-800">История списаний из Шоурума (на отправку)</h3>
                    <span className="ml-2 bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full text-xs font-bold">
                        {Object.values(groupedTransfers).flat().length}
                    </span>
                </div>
                
                {Object.keys(groupedTransfers).length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        <PackageOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Нет истории списаний из шоурума для заказов на отправку.</p>
                    </div>
                ) : (
                    <div className="divide-y-4 divide-gray-100">
                        {Object.entries(groupedTransfers).map(([dateLabel, tasks]) => (
                            <div key={dateLabel}>
                                <div className="bg-gray-100/50 px-4 py-2 font-bold text-gray-700 border-b border-gray-200">
                                    {dateLabel}
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {tasks.map((task) => (
                                        <div key={task.id} className={`p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center transition-colors ${task.isTransferred ? "bg-gray-50/50 opacity-60" : "hover:bg-gray-50"}`}>
                                            <button 
                                                onClick={() => handleToggleStatus(task.id, task.isTransferred)}
                                                disabled={isPending}
                                                className="mt-2 sm:mt-0 flex-shrink-0 focus:outline-none disabled:opacity-50"
                                            >
                                                {task.isTransferred ? (
                                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                                ) : (
                                                    <Circle className="w-8 h-8 text-gray-300 hover:text-green-400 transition-colors" />
                                                )}
                                            </button>
                                            
                                            {task.image ? (
                                                <img src={task.image} alt={task.productName} className={`w-16 h-16 object-cover rounded-md border border-gray-200 ${task.isTransferred ? 'grayscale' : ''}`} />
                                            ) : (
                                                <div className="w-16 h-16 bg-gray-200 rounded-md border border-gray-300 flex items-center justify-center text-gray-400">
                                                    <PackageOpen className="w-6 h-6" />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className={`font-bold text-lg ${task.isTransferred ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{task.productName}</h4>
                                                    {task.productSize && (
                                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded border">
                                                            Размер: {task.productSize}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500">Штрихкод: {task.productSku}</div>
                                            </div>
                                            
                                            <div className="flex flex-col sm:items-end gap-1">
                                                <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium border border-blue-100">
                                                    Заказ: {task.orderNumber}
                                                </div>
                                                <div className="flex items-center text-xs text-gray-400">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {new Date(task.date).toLocaleTimeString('ru-RU', { 
                                                        hour: '2-digit', minute: '2-digit' 
                                                    })}
                                                </div>
                                            </div>
                                            
                                            <div className="bg-amber-100 text-amber-800 font-bold px-4 py-2 rounded-lg text-lg min-w-[3rem] text-center shadow-sm border border-amber-200">
                                                {task.quantity} шт.
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isQuickSaleOpen && (
                <CreateOrderModal 
                    isQuickSale={true} 
                    onClose={() => setIsQuickSaleOpen(false)} 
                />
            )}
        </div>
    );
}

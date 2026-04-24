"use client";

import { useState } from "react";
import { Loader2, X, ArrowRightLeft } from "lucide-react";
import { transferProducts } from "@/app/actions";

interface Product {
    id: number;
    name: string;
    sku: string;
    size: string | null;
    quantity: number;
    quantityShowroom: number;
}

interface TransferModalProps {
    products: Product[];
    selectedIds: number[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function TransferModal({ products, selectedIds, onClose, onSuccess }: TransferModalProps) {
    const selectedProducts = products.filter(p => selectedIds.includes(p.id));
    const [direction, setDirection] = useState<"TO_SHOWROOM" | "TO_WAREHOUSE">("TO_SHOWROOM");
    const [loading, setLoading] = useState(false);
    
    // Default quantity to transfer is 1 or max available
    const [quantities, setQuantities] = useState<Record<number, number>>(
        selectedProducts.reduce((acc, p) => {
            acc[p.id] = 1;
            return acc;
        }, {} as Record<number, number>)
    );

    const handleQuantityChange = (id: number, val: string, maxAvailable: number) => {
        let parsed = parseInt(val) || 0;
        if (parsed < 0) parsed = 0;
        if (parsed > maxAvailable) parsed = maxAvailable;
        
        setQuantities(prev => ({ ...prev, [id]: parsed }));
    };

    const handleMaxClick = (id: number, maxAvailable: number) => {
        setQuantities(prev => ({ ...prev, [id]: maxAvailable }));
    };

    const handleTransfer = async () => {
        const itemsToTransfer = selectedProducts
            .map(p => ({ id: p.id, qty: quantities[p.id] || 0 }))
            .filter(item => item.qty > 0);

        if (itemsToTransfer.length === 0) {
            alert("Укажите количество больше нуля хотя бы для одного товара.");
            return;
        }

        setLoading(true);
        const res = await transferProducts(itemsToTransfer, direction);
        setLoading(false);

        if (res.success) {
            onSuccess();
        } else {
            alert(res.error || "Не удалось переместить товары");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl flex flex-col shadow-xl max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-600" /> Перемещение товаров
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="flex gap-4 p-3 bg-gray-50 border rounded-lg">
                        <label className={`flex-1 flex gap-2 items-center p-3 border rounded cursor-pointer transition-colors ${direction === "TO_SHOWROOM" ? "bg-indigo-50 border-indigo-200" : "bg-white"}`}>
                            <input 
                                type="radio" 
                                name="direction" 
                                checked={direction === "TO_SHOWROOM"} 
                                onChange={() => setDirection("TO_SHOWROOM")}
                                className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                            />
                            <div>
                                <div className="font-bold text-gray-800">На Шоурум</div>
                                <div className="text-xs text-gray-500">Склад → Шоурум</div>
                            </div>
                        </label>

                        <label className={`flex-1 flex gap-2 items-center p-3 border rounded cursor-pointer transition-colors ${direction === "TO_WAREHOUSE" ? "bg-indigo-50 border-indigo-200" : "bg-white"}`}>
                            <input 
                                type="radio" 
                                name="direction" 
                                checked={direction === "TO_WAREHOUSE"} 
                                onChange={() => setDirection("TO_WAREHOUSE")}
                                className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                            />
                            <div>
                                <div className="font-bold text-gray-800">На Склад</div>
                                <div className="text-xs text-gray-500">Шоурум → Склад</div>
                            </div>
                        </label>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-3">Товар</th>
                                    <th className="p-3 w-32 border-l bg-green-50 text-green-800">Склад</th>
                                    <th className="p-3 w-32 border-l bg-purple-50 text-purple-800">Шоурум</th>
                                    <th className="p-3 w-40 border-l text-center">Кол-во для пер.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {selectedProducts.map(p => {
                                    const available = direction === "TO_SHOWROOM" ? p.quantity : p.quantityShowroom;
                                    const qty = quantities[p.id] || 0;
                                    const warning = qty > available;

                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="p-3">
                                                <div className="font-medium text-gray-900">{p.name}</div>
                                                <div className="text-xs text-gray-500">{p.sku} {p.size ? ` • ${p.size}` : ""}</div>
                                            </td>
                                            <td className={`p-3 border-l font-bold ${direction === "TO_SHOWROOM" ? "text-green-600" : "text-gray-500"}`}>
                                                {p.quantity} 
                                                {direction === "TO_SHOWROOM" && qty > 0 && !warning && <span className="text-red-500 text-xs ml-1">-{qty}</span>}
                                                {direction === "TO_WAREHOUSE" && qty > 0 && !warning && <span className="text-blue-500 text-xs ml-1">+{qty}</span>}
                                            </td>
                                            <td className={`p-3 border-l font-bold ${direction === "TO_WAREHOUSE" ? "text-purple-600" : "text-gray-500"}`}>
                                                {p.quantityShowroom}
                                                {direction === "TO_WAREHOUSE" && qty > 0 && !warning && <span className="text-red-500 text-xs ml-1">-{qty}</span>}
                                                {direction === "TO_SHOWROOM" && qty > 0 && !warning && <span className="text-blue-500 text-xs ml-1">+{qty}</span>}
                                            </td>
                                            <td className="p-3 border-l">
                                                <div className="flex bg-white border rounded focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max={available}
                                                        className={`w-full p-2 outline-none font-bold text-center ${warning ? "text-red-600 bg-red-50" : ""}`}
                                                        value={qty.toString()}
                                                        onChange={(e) => handleQuantityChange(p.id, e.target.value, available)}
                                                    />
                                                    <button 
                                                        onClick={() => handleMaxClick(p.id, available)}
                                                        className="px-2 bg-gray-100 hover:bg-gray-200 text-xs font-bold border-l text-gray-600 transition-colors"
                                                        title="Все"
                                                    >
                                                        MAX
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-white border rounded text-sm hover:bg-gray-100 font-medium text-gray-700">
                        Отмена
                    </button>
                    <button
                        onClick={handleTransfer}
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 flex items-center gap-2 font-medium disabled:opacity-50 transition-colors"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Подтвердить перемещение
                    </button>
                </div>
            </div>
        </div>
    );
}

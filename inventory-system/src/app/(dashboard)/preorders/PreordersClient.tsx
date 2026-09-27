"use client";

import { useState } from "react";
import { Check, Loader2, ShoppingBag } from "lucide-react";
import { format } from "date-fns";

export default function PreordersClient({ initialProducts }: { initialProducts: any[] }) {
    const [products, setProducts] = useState(initialProducts);
    const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});

    const toggleSupplierOrdered = async (itemId: number, currentStatus: boolean) => {
        setLoadingMap(prev => ({ ...prev, [itemId]: true }));
        try {
            const res = await fetch('/api/preorders/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, supplierOrdered: !currentStatus })
            });
            
            if (res.ok) {
                setProducts(prev => prev.map(p => ({
                    ...p,
                    orderItems: p.orderItems.map((item: any) => 
                        item.id === itemId ? { ...item, supplierOrdered: !currentStatus } : item
                    )
                })));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMap(prev => ({ ...prev, [itemId]: false }));
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <ShoppingBag className="w-8 h-8 text-purple-600" />
                    Предзаказы (Закуп)
                </h1>
            </div>

            {products.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                    Нет активных товаров по предзаказу.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => {
                        const totalOrdered = product.orderItems.length;
                        const pendingPurchase = product.orderItems.filter((i: any) => !i.supplierOrdered).length;
                        const alreadyPurchased = totalOrdered - pendingPurchase;

                        // Group by size
                        const sizes: Record<string, { total: number, pending: number }> = {};
                        product.orderItems.forEach((item: any) => {
                            const s = item.size || 'Без размера';
                            if (!sizes[s]) sizes[s] = { total: 0, pending: 0 };
                            sizes[s].total++;
                            if (!item.supplierOrdered) sizes[s].pending++;
                        });

                        return (
                            <div key={product.id} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden flex flex-col">
                                <div className="flex gap-4 p-4 border-b bg-gray-50">
                                    <div className="w-20 h-24 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                        {product.image ? (
                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">Нет фото</div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg leading-tight mb-1">{product.name}</h3>
                                        <p className="text-sm text-gray-500 mb-2">SKU: {product.sku}</p>
                                        
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-semibold">
                                                Всего заказов: {totalOrdered}
                                            </span>
                                            {pendingPurchase > 0 ? (
                                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded font-bold animate-pulse">
                                                    К закупу: {pendingPurchase}
                                                </span>
                                            ) : (
                                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">
                                                    Всё закуплено
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 flex-1 overflow-y-auto max-h-96">
                                    {Object.keys(sizes).length > 0 && (
                                        <div className="mb-4 pb-4 border-b border-dashed">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Сводка по размерам:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(sizes).map(([size, counts]) => (
                                                    <div key={size} className="text-sm border rounded px-2 py-1 bg-gray-50">
                                                        <span className="font-bold">{size}:</span> {counts.pending > 0 ? <span className="text-red-600 font-bold">{counts.pending} к закупу</span> : <span className="text-green-600">{counts.total} куплено</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Заказы клиентов:</h4>
                                    <div className="space-y-3">
                                        {product.orderItems.map((item: any) => (
                                            <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${item.supplierOrdered ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-100'}`}>
                                                <div>
                                                    <div className="font-semibold text-sm">{item.order.orderNumber}</div>
                                                    <div className="text-xs text-gray-600 flex items-center gap-2">
                                                        <span>{item.order.clientName || 'Без имени'}</span>
                                                        <span className="text-gray-300">|</span>
                                                        <span className="font-bold">Разм: {item.size || '-'}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        {format(new Date(item.order.createdAt), 'dd.MM.yyyy HH:mm')}
                                                    </div>
                                                </div>
                                                
                                                <button
                                                    onClick={() => toggleSupplierOrdered(item.id, item.supplierOrdered)}
                                                    disabled={loadingMap[item.id]}
                                                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                                                        item.supplierOrdered 
                                                            ? 'bg-green-500 hover:bg-green-600 text-white' 
                                                            : 'bg-white border-2 border-gray-300 hover:border-green-500 text-transparent hover:text-green-500'
                                                    }`}
                                                    title={item.supplierOrdered ? 'Отменить отметку' : 'Отметить как закуплено'}
                                                >
                                                    {loadingMap[item.id] ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : <Check className="w-6 h-6" />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

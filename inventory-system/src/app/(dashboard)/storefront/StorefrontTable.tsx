"use client";

import { useState } from "react";
import { deleteStorefrontProduct } from "@/app/actions";
import { Trash2, ExternalLink, Tag, CheckSquare, Square, Edit2 } from "lucide-react";
import DiscountStorefrontModal from "./DiscountStorefrontModal";
import EditStorefrontModal from "./EditStorefrontModal";

interface Product {
    id: number;
    name: string;
    size: string | null;
    price: number;
    quantity: number;
}

interface StorefrontProduct {
    id: number;
    name: string;
    description: string | null;
    image: string | null;
    images: string[];
    video: string | null;
    isActive: boolean;
    products: Product[];
    discountPrice: number | null;
}

export default function StorefrontTable({ products }: { products: StorefrontProduct[] }) {
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<StorefrontProduct | null>(null);

    const toggleSelectAll = () => {
        if (selectedIds.length === products.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(products.map(p => p.id));
        }
    };

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(pid => pid !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Вы уверены, что хотите удалить эту карточку витрины? (Складские товары не удалятся, пропадёт только связь)")) return;
        setIsDeleting(id);
        try {
            await deleteStorefrontProduct(id);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Bulk Actions Toolbar */}
            {selectedIds.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-red-100 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                            Выбрано: {selectedIds.length}
                        </span>
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsDiscountModalOpen(true)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Tag className="w-4 h-4" />
                            % Скидка
                        </button>
                    </div>
                </div>
            )}

        <div className="bg-white rounded-lg shadow border">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b">
                        <tr>
                            <th className="px-6 py-3 w-10">
                                <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                                    {selectedIds.length === products.length && products.length > 0 ? (
                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                    ) : (
                                        <Square className="w-5 h-5" />
                                    )}
                                </button>
                            </th>
                            <th className="px-6 py-3 w-20">ID</th>
                            <th className="px-6 py-3 w-24">Фото</th>
                            <th className="px-6 py-3">Общее название витрины</th>
                            <th className="px-6 py-3">Привязанные размеры</th>
                            <th className="px-6 py-3 w-24 text-center">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                    Пока нет объединенных карточек. Создайте их во вкладке "Склад".
                                </td>
                            </tr>
                        ) : null}

                        {products.map(p => (
                            <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <button onClick={() => toggleSelect(p.id)} className="text-gray-400 hover:text-gray-600">
                                        {selectedIds.includes(p.id) ? (
                                            <CheckSquare className="w-5 h-5 text-blue-600" />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">#{p.id}</td>
                                <td className="px-6 py-4">
                                    {p.image ? (
                                        <div className="w-12 h-12 rounded overflow-hidden shadow border bg-gray-100">
                                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                            Нет фото
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                        {p.name}
                                        {p.discountPrice ? (
                                            <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded shadow-sm">
                                                СКИДКА {p.discountPrice} ₸
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                        <span className={`inline-block w-2 h-2 rounded-full ${p.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                        {p.isActive ? "Отображается на сайте" : "Скрыто"}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {p.products.length === 0 ? (
                                            <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">Нет привязанных</span>
                                        ) : (
                                            p.products.map(variant => (
                                                <div key={variant.id} className="text-xs bg-gray-100 border border-gray-200 px-2 py-1 rounded shadow-sm" title={variant.name}>
                                                    <span className="font-semibold text-gray-700">{variant.size || "Без размера"}</span>
                                                    <span className="ml-2 text-gray-500">({variant.quantity} шт)</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => setEditingProduct(p)}
                                        className="text-gray-400 hover:text-blue-600 transition"
                                        title="Редактировать"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(p.id)}
                                        disabled={isDeleting === p.id}
                                        className="text-gray-400 hover:text-red-600 transition"
                                        title="Удалить карточку"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <DiscountStorefrontModal
                isOpen={isDiscountModalOpen}
                onClose={() => setIsDiscountModalOpen(false)}
                selectedIds={selectedIds}
                onSuccess={() => {
                    setIsDiscountModalOpen(false);
                    setSelectedIds([]);
                }}
            />

            {editingProduct && (
                <EditStorefrontModal
                    product={editingProduct}
                    onClose={() => setEditingProduct(null)}
                    onSuccess={() => setEditingProduct(null)}
                />
            )}
        </div>
        </div>
    );
}

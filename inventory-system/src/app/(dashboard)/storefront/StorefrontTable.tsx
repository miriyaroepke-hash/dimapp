"use client";

import { useState } from "react";
import { deleteStorefrontProduct, bulkAssignCategory, removeCategoryFromProduct } from "@/app/actions";
import { Trash2, Tag, CheckSquare, Square, Edit2, FolderPlus, Plus } from "lucide-react";
import DiscountStorefrontModal from "./DiscountStorefrontModal";
import EditStorefrontModal from "./EditStorefrontModal";

interface Product {
    id: number;
    name: string;
    sku: string;
    kaspiSku: string | null;
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
    categories: string[];
}

const FALLBACK_CATEGORIES = [
    { id: 'new', label: 'Новинки' },
    { id: 'dresses', label: 'Платья' },
    { id: 'pants', label: 'Брюки' },
    { id: 'shirts', label: 'Рубашки' },
    { id: 'skirts', label: 'Юбки' },
    { id: 'suits', label: 'Костюмы' },
    { id: 'sale', label: 'Скидки (SALE)' },
];

export default function StorefrontTable({ products, initialCategories }: { products: StorefrontProduct[]; initialCategories?: { id: string; label: string; isHidden?: boolean }[] }) {
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<StorefrontProduct | null>(null);
    const [bulkCategory, setBulkCategory] = useState("");
    const [isAssigning, setIsAssigning] = useState(false);
    const [loadingProductCat, setLoadingProductCat] = useState<string | null>(null);

    const CATEGORIES = (initialCategories && initialCategories.length > 0)
        ? initialCategories
            .filter(c => c.id !== 'preorder')
            .map(c => ({ id: c.id, label: c.id === 'sale' ? 'Скидки (SALE)' : c.label }))
        : FALLBACK_CATEGORIES;

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

    const handleBulkCategory = async () => {
        if (!bulkCategory || selectedIds.length === 0) return;
        setIsAssigning(true);
        try {
            await bulkAssignCategory(selectedIds, bulkCategory);
            alert("Категория добавлена!");
            setSelectedIds([]);
        } catch (error: any) {
            alert("Ошибка при назначении категории");
        } finally {
            setIsAssigning(false);
        }
    };

    const handleQuickToggleCategory = async (product: StorefrontProduct, catId: string) => {
        const key = `${product.id}-${catId}`;
        setLoadingProductCat(key);
        try {
            const hasCat = (product.categories || []).includes(catId);
            if (hasCat) {
                await removeCategoryFromProduct(product.id, catId);
            } else {
                await bulkAssignCategory([product.id], catId);
            }
        } catch (e) {
            alert("Ошибка при изменении категории");
        } finally {
            setLoadingProductCat(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Bulk Actions Toolbar */}
            {selectedIds.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                            Выбрано: {selectedIds.length}
                        </span>
                        
                        <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
                            <select
                                value={bulkCategory}
                                onChange={(e) => setBulkCategory(e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                            >
                                <option value="">Выберите категорию...</option>
                                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                            <button
                                onClick={handleBulkCategory}
                                disabled={isAssigning || !bulkCategory}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                <FolderPlus className="w-4 h-4" />
                                {isAssigning ? "Назначаем..." : "В категорию"}
                            </button>
                        </div>
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
                            <th className="px-4 py-3 w-10">
                                <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                                    {selectedIds.length === products.length && products.length > 0 ? (
                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                    ) : (
                                        <Square className="w-5 h-5" />
                                    )}
                                </button>
                            </th>
                            <th className="px-4 py-3 w-16">ID</th>
                            <th className="px-4 py-3 w-20">Фото</th>
                            <th className="px-4 py-3">Товар и категории (признак)</th>
                            <th className="px-4 py-3">Привязанные размеры</th>
                            <th className="px-4 py-3 w-24 text-center">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                    Пока нет объединенных карточек. Создайте их во вкладке "Склад".
                                </td>
                            </tr>
                        ) : null}

                        {products.map(p => (
                            <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                                <td className="px-4 py-4 align-top">
                                    <button onClick={() => toggleSelect(p.id)} className="text-gray-400 hover:text-gray-600">
                                        {selectedIds.includes(p.id) ? (
                                            <CheckSquare className="w-5 h-5 text-blue-600" />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                </td>
                                <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500 align-top">#{p.id}</td>
                                <td className="px-4 py-4 align-top">
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
                                <td className="px-4 py-4 align-top">
                                    <div className="font-medium text-gray-900 flex flex-wrap items-center gap-2">
                                        {p.name}
                                        {p.discountPrice ? (
                                            <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded shadow-sm">
                                                СКИДКА {p.discountPrice} ₸
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <span className={`inline-block w-2 h-2 rounded-full ${p.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                        {p.isActive ? "Отображается на сайте" : "Скрыто"}
                                    </div>

                                    {/* Quick Category Buttons (Платья, Брюки, Рубашки и т.д.) */}
                                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                        {CATEGORIES.map(cat => {
                                            const isAssigned = (p.categories || []).includes(cat.id);
                                            const isBusy = loadingProductCat === `${p.id}-${cat.id}`;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => handleQuickToggleCategory(p, cat.id)}
                                                    title={isAssigned ? `Убрать из категории «${cat.label}»` : `Добавить в категорию «${cat.label}»`}
                                                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                                                        isAssigned
                                                            ? "bg-indigo-600 text-white border-indigo-600 font-semibold shadow-sm hover:bg-indigo-700"
                                                            : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50"
                                                    } ${isBusy ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                                                >
                                                    {isAssigned ? (
                                                        <>
                                                            <span>✓ {cat.label}</span>
                                                            <span className="ml-0.5 opacity-80">×</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus className="w-3 h-3 opacity-60" />
                                                            <span>{cat.label}</span>
                                                        </>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </td>
                                <td className="px-4 py-4 align-top">
                                    <div className="flex flex-wrap gap-1">
                                        {p.products.length === 0 ? (
                                            <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">Нет привязанных</span>
                                        ) : (
                                            p.products.map(variant => (
                                                <div key={variant.id} className="text-xs bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded shadow-sm flex flex-col gap-0.5" title={variant.name}>
                                                    <div>
                                                        <span className="font-semibold text-gray-800">{variant.size || "Без размера"}</span>
                                                        <span className="ml-1.5 text-gray-500">({variant.quantity} шт)</span>
                                                    </div>
                                                    <div className="font-mono text-[11px] text-gray-600">
                                                        {variant.kaspiSku ? (
                                                            <span className="text-red-600 font-semibold">Kaspi: {variant.kaspiSku}</span>
                                                        ) : (
                                                            <span>ШК: {variant.sku}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center align-top">
                                    <div className="flex items-center justify-center gap-3">
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
                                    </div>
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
                    categoriesList={CATEGORIES}
                    onClose={() => setEditingProduct(null)}
                    onSuccess={() => setEditingProduct(null)}
                />
            )}
        </div>
        </div>
    );
}

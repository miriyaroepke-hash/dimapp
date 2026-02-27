"use client";

import { useState } from "react";
import { Loader2, X, Upload } from "lucide-react";
import { compressImage } from "@/lib/utils";
import { updateProduct } from "@/app/actions";

interface Product {
    id: number;
    name: string;
    sku: string;
    kaspiSku: string | null;
    size: string | null;
    price: number;
    quantity: number;
    image: string | null;
}

interface EditProductModalProps {
    product: Product;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditProductModal({ product, onClose, onSuccess }: EditProductModalProps) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: product.name,
        sku: product.sku,
        kaspiSku: product.kaspiSku || "",
        size: product.size || "",
        price: product.price.toString(),
        quantity: product.quantity.toString(),
        image: product.image || "",
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setForm({ ...form, image: compressed });
            } catch (error) {
                console.error("Image upload failed", error);
            }
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.price || !form.sku) {
            alert("Пожалуйста, заполните обязательные поля (Название, Штрихкод, Цена)");
            return;
        }

        setLoading(true);
        const res = await updateProduct(product.id, {
            ...form,
            price: parseFloat(form.price),
            quantity: parseInt(form.quantity),
        });
        setLoading(false);

        if (res.success) {
            onSuccess();
        } else {
            alert(res.error || "Не удалось сохранить товар");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md flex flex-col shadow-xl">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold">Редактировать товар</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Image Upload */}
                    <div className="flex justify-center">
                        <label className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 relative overflow-hidden group">
                            {form.image ? (
                                <>
                                    <img src={form.image} className="w-full h-full object-cover" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs">
                                        Изменить фото
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center text-gray-400">
                                    <Upload className="w-6 h-6 mb-1" />
                                    <span className="text-xs">Загрузить</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Наименование *</label>
                            <input
                                className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Штрихкод *</label>
                                <input
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                                    value={form.sku}
                                    onChange={e => setForm({ ...form, sku: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Артикул Kaspi</label>
                                <input
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                                    value={form.kaspiSku}
                                    onChange={e => setForm({ ...form, kaspiSku: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Размер</label>
                                <input
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                    value={form.size}
                                    onChange={e => setForm({ ...form, size: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Цена (₸) *</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 font-bold"
                                    value={form.price}
                                    onChange={e => setForm({ ...form, price: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Остаток *</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 font-bold"
                                    value={form.quantity}
                                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-white border rounded text-sm hover:bg-gray-100 font-medium">
                        Отмена
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2 font-medium"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
}

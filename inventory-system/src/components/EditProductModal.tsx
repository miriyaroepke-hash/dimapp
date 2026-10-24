"use client";

import { useState } from "react";
import { Loader2, X, Upload, Printer } from "lucide-react";
import { updateProduct } from "@/app/actions";
import { printLabel } from "@/lib/printLabel";

interface Product {
    id: number;
    name: string;
    sku: string;
    kaspiSku: string | null;
    size: string | null;
    price: number;
    quantity: number;
    quantityShowroom: number;
    preOrderDays?: number | null;
    image: string | null;
    isPreorder: boolean;
    labelName?: string | null;
    composition?: string | null;
    manufacturer?: string | null;
}

interface EditProductModalProps {
    product: Product;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditProductModal({ product, onClose, onSuccess }: EditProductModalProps) {
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [applyImageToAll, setApplyImageToAll] = useState(false);
    const [form, setForm] = useState({
        name: product.name,
        sku: product.sku,
        kaspiSku: product.kaspiSku || "",
        size: product.size || "",
        price: product.price.toString(),
        quantity: product.quantity.toString(),
        quantityShowroom: product.quantityShowroom.toString(),
        preOrderDays: (product.preOrderDays ?? 0).toString(),
        image: product.image || "",
        isPreorder: (product as any).isPreorder || false,
        labelName: product.labelName || "",
        composition: product.composition || "",
        manufacturer: product.manufacturer || "DIMMIANI, Казахстан",
    });

    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1600;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Compression failed"));
                    }, "image/jpeg", 0.8);
                };
                img.onerror = () => reject(new Error("Image load error"));
            };
            reader.onerror = () => reject(new Error("File read error"));
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const compressedBlob = await compressImage(file);
            const formData = new FormData();
            formData.append("file", compressedBlob, "product_image.jpg");

            const res = await fetch("/api/upload-image", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.details || data.error || "Upload failed");
            }

            setForm({ ...form, image: data.url });
            setApplyImageToAll(true);
        } catch (error) {
            console.error("Image upload failed", error);
            alert("Не удалось загрузить фото. Возможно, оно слишком большое или не поддерживается. Попробуйте скриншот.");
        } finally {
            setUploadingImage(false);
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
            kaspiSku: form.kaspiSku.trim() || null,
            price: parseFloat(form.price),
            quantity: parseInt(form.quantity) || 0,
            quantityShowroom: 0,
            preOrderDays: parseInt(form.preOrderDays) || 0,
            isPreorder: form.isPreorder,
            labelName: form.labelName.trim() || null,
            composition: form.composition.trim() || null,
            manufacturer: form.manufacturer.trim() || null,
            applyImageToAll
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
            <div className="bg-white rounded-lg w-full max-w-lg max-h-[92vh] flex flex-col shadow-xl">
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
                    <div className="flex flex-col items-center gap-2">
                        <label className="w-28 h-28 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 relative overflow-hidden group">
                            {uploadingImage ? (
                                <div className="flex flex-col items-center text-blue-500">
                                    <Loader2 className="w-6 h-6 animate-spin mb-1" />
                                    <span className="text-xs">Загрузка...</span>
                                </div>
                            ) : form.image ? (
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
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={uploadingImage}
                            />
                        </label>
                        
                        <label className="flex items-center gap-2 text-xs text-gray-700 font-medium mt-1 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                            <input 
                                type="checkbox" 
                                className="rounded text-blue-600"
                                checked={applyImageToAll}
                                onChange={(e) => setApplyImageToAll(e.target.checked)}
                            />
                            Применить фото и составник ко всем размерам «{form.name}»
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
                                <label className="block text-xs font-medium text-gray-700 mb-1">Штрихкод / Артикул *</label>
                                <input
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                                    value={form.sku}
                                    onChange={e => setForm({ ...form, sku: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-red-600 mb-1">Артикул Kaspi</label>
                                <input
                                    className="w-full border border-red-200 bg-red-50/30 p-2 rounded text-sm focus:ring-2 focus:ring-red-500 font-mono"
                                    placeholder="Например: 109680982"
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
                                <label className="block text-xs font-medium text-gray-700 mb-1">Склад *</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 font-bold text-green-700 disabled:opacity-50 disabled:bg-gray-100"
                                    disabled={form.isPreorder}
                                    value={form.quantity}
                                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Блок этикетки-составника */}
                        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                    🧵 Этикетка-составник (RU / KZ)
                                </span>
                                <button
                                    type="button"
                                    onClick={() => printLabel([{
                                        name: form.name,
                                        sku: form.sku,
                                        price: parseFloat(form.price) || 0,
                                        size: form.size || null,
                                        labelName: form.labelName || null,
                                        composition: form.composition || null,
                                        manufacturer: form.manufacturer || null,
                                    }], "care")}
                                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded flex items-center gap-1 font-medium shadow-sm transition-colors"
                                    title="Сразу распечатать составник"
                                >
                                    <Printer className="w-3.5 h-3.5" /> Печать составника
                                </button>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                                    Наименование / Атауы
                                </label>
                                <input
                                    className="w-full border bg-white p-1.5 rounded text-xs focus:ring-2 focus:ring-amber-500"
                                    placeholder={form.name || "Куртка женская / Әйелдер күртесі"}
                                    value={form.labelName}
                                    onChange={e => {
                                        setForm({ ...form, labelName: e.target.value });
                                        setApplyImageToAll(true);
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                                    Состав / Құрамы
                                </label>
                                <input
                                    className="w-full border bg-white p-1.5 rounded text-xs focus:ring-2 focus:ring-amber-500"
                                    placeholder="Например: 100% хлопок / 100% мақта"
                                    value={form.composition}
                                    onChange={e => {
                                        setForm({ ...form, composition: e.target.value });
                                        setApplyImageToAll(true);
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                                    Производитель / Өндіруші
                                </label>
                                <input
                                    className="w-full border bg-white p-1.5 rounded text-xs focus:ring-2 focus:ring-amber-500"
                                    placeholder="Например: DIMMIANI, Казахстан"
                                    value={form.manufacturer}
                                    onChange={e => {
                                        setForm({ ...form, manufacturer: e.target.value });
                                        setApplyImageToAll(true);
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Предзаказ Kaspi (дней ожидания, 0 — нет)</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                                value={form.preOrderDays}
                                onChange={e => setForm({ ...form, preOrderDays: e.target.value })}
                            />
                        </div>
                        
                        <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-lg border border-purple-100">
                            <input 
                                type="checkbox" 
                                id="edit-isPreorder"
                                checked={form.isPreorder}
                                onChange={(e) => setForm({ ...form, isPreorder: e.target.checked })}
                                className="w-5 h-5 text-purple-600 rounded cursor-pointer" 
                            />
                            <label htmlFor="edit-isPreorder" className="font-bold text-purple-800 cursor-pointer select-none text-sm">
                                Предзаказ на сайте (доступен под заказ с фабрики)
                            </label>
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
                        disabled={loading || uploadingImage}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2 font-medium disabled:opacity-50"
                    >
                        {(loading || uploadingImage) && <Loader2 className="w-4 h-4 animate-spin" />}
                        {uploadingImage ? "Загрузка фото..." : "Сохранить"}
                    </button>
                </div>
            </div>
        </div>
    );
}

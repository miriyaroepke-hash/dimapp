"use client";

import { useState } from "react";
import { Loader2, X, Upload } from "lucide-react";
import { updateProduct } from "@/app/actions";

interface Product {
    id: number;
    name: string;
    sku: string;
    kaspiSku: string | null;
    size: string | null;
    price: number;
    quantity: number;
    quantityShowroom: number;
    image: string | null;
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
        size: product.size || "",
        price: product.price.toString(),
        quantity: product.quantity.toString(),
        quantityShowroom: product.quantityShowroom.toString(),
        image: product.image || "",
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
            setApplyImageToAll(true); // Auto-check to save user time
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
            price: parseFloat(form.price),
            quantity: parseInt(form.quantity),
            quantityShowroom: parseInt(form.quantityShowroom),
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
                    <div className="flex flex-col items-center gap-2">
                        <label className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 relative overflow-hidden group">
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
                        
                        <label className="flex items-center gap-2 text-xs text-gray-600 mt-1 cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="rounded text-blue-600"
                                checked={applyImageToAll}
                                onChange={(e) => setApplyImageToAll(e.target.checked)}
                            />
                            Применить ко всем размерам "{form.name}"
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
                                <label className="block text-xs font-medium text-gray-700 mb-1">Размер</label>
                                <input
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                    value={form.size}
                                    onChange={e => setForm({ ...form, size: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
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
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 font-bold text-green-700"
                                    value={form.quantity}
                                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Шоурум *</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 font-bold text-purple-700"
                                    value={form.quantityShowroom}
                                    onChange={e => setForm({ ...form, quantityShowroom: e.target.value })}
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

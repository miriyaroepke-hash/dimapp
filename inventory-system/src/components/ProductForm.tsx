"use client";

import { useState } from "react";
import { createProduct } from "@/app/actions";
import { Upload, Plus, X } from "lucide-react";
import Image from "next/image";

export default function ProductForm() {
    const [isMassAdd, setIsMassAdd] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Client-side image compression could go here (using canvas)
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <form action={createProduct} className="space-y-6 max-w-2xl mx-auto bg-white p-6 rounded shadow">
            {/* Hidden inputs for complex handled state */}
            <input type="hidden" name="image" value={imagePreview || ""} />
            <input type="hidden" name="isMassAdd" value={String(isMassAdd)} />

            <div className="flex gap-4 mb-6">
                <button
                    type="button"
                    onClick={() => setIsMassAdd(false)}
                    className={`flex-1 py-2 text-center rounded ${!isMassAdd ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                >
                    Один товар
                </button>
                <button
                    type="button"
                    onClick={() => setIsMassAdd(true)}
                    className={`flex-1 py-2 text-center rounded ${isMassAdd ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                >
                    Линейка (Массовое добавление)
                </button>
            </div>

            <div>
                <label className="block font-medium mb-1">Название товара</label>
                <input name="name" required className="w-full border p-2 rounded" />
            </div>

            {!isMassAdd ? (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-medium mb-1">Цена</label>
                            <input name="price" type="number" required className="w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block font-medium mb-1">Количество (шт)</label>
                            <input name="quantity" type="number" defaultValue={0} required className="w-full border p-2 rounded" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block font-medium mb-1">Артикул / Штрихкод</label>
                            <input name="sku" className="w-full border p-2 rounded" placeholder="Сканируйте или оставьте пустым" />
                        </div>
                        <div>
                            <label className="block font-medium mb-1">Артикул в Kaspi</label>
                            <input name="kaspiSku" className="w-full border p-2 rounded" placeholder="Например: 12345678" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="block font-medium mb-1">Размер</label>
                        <input name="size" className="w-full border p-2 rounded" />
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block font-medium mb-1">Цена (для всех)</label>
                        <input name="price" type="number" required className="w-full border p-2 rounded" />
                    </div>

                    <div className="bg-gray-50 p-4 rounded border">
                        <label className="block font-medium mb-3">Размеры и Количество</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {["42", "44", "46", "48", "50", "52", "54"].map(size => (
                                <div key={size} className="bg-white p-3 rounded border shadow-sm">
                                    <label className="block text-sm font-bold text-gray-700 mb-1 text-center">Размер {size}</label>
                                    <input
                                        type="number"
                                        name={`qty_${size}`}
                                        placeholder="Кол-во"
                                        min="0"
                                        className="w-full border p-1 rounded text-center"
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Введите количество только для нужных размеров. Остальные оставьте пустыми.</p>
                    </div>
                </div>
            )}

            {/* Image Upload */}
            <div>
                <label className="block font-medium mb-1">Фото</label>
                <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center cursor-pointer hover:bg-gray-50 relative">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {imagePreview ? (
                        <div className="relative h-48 w-full mx-auto">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imagePreview} alt="Preview" className="h-full mx-auto object-contain" />
                            <button
                                type="button"
                                className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent re-triggering file input
                                    setImagePreview(null);
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-gray-400">
                            <Upload className="w-8 h-8 mb-2" />
                            <span>Нажмите, чтобы загрузить</span>
                        </div>
                    )}
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 font-bold"
            >
                {loading ? "Сохранение..." : "Сохранить товар"}
            </button>
        </form>
    );
}

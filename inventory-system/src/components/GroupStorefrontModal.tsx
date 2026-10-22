"use client";

import { useState, useEffect } from "react";
import { createStorefrontProduct, getStorefrontProducts, addProductsToStorefront, getCategoryContents } from "@/app/actions";
import { Loader2, X, Plus, LogIn, Check } from "lucide-react";

interface Product {
    id: number;
    name: string;
    image: string | null;
}

interface Props {
    products: Product[];
    selectedIds: number[];
    onClose: () => void;
    onSuccess: () => void;
}

const DEFAULT_CATS = [
    { id: 'new', label: 'Новинки' },
    { id: 'dresses', label: 'Платья' },
    { id: 'pants', label: 'Брюки' },
    { id: 'shirts', label: 'Рубашки' },
    { id: 'skirts', label: 'Юбки' },
    { id: 'suits', label: 'Костюмы' },
    { id: 'sale', label: 'Скидки (SALE)' },
];

export default function GroupStorefrontModal({ products, selectedIds, onClose, onSuccess }: Props) {
    const selectedProducts = products.filter(p => selectedIds.includes(p.id));
    const firstProduct = selectedProducts[0];
    
    let defaultName = firstProduct?.name || "";
    
    const [name, setName] = useState(defaultName);
    const [image, setImage] = useState(firstProduct?.image || "");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [categoriesList, setCategoriesList] = useState<{ id: string; label: string }[]>(DEFAULT_CATS);
    const [isLoading, setIsLoading] = useState(false);
    
    const [mode, setMode] = useState<"NEW" | "EXISTING">("NEW");
    const [storefronts, setStorefronts] = useState<any[]>([]);
    const [selectedStorefrontId, setSelectedStorefrontId] = useState<number | null>(null);

    useEffect(() => {
        getStorefrontProducts().then(sf => setStorefronts(sf));
        getCategoryContents().then(contents => {
            const raw = contents?.['_categories_config_']?.text_ru;
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setCategoriesList(parsed.filter((c: any) => c.id !== 'preorder').map((c: any) => ({ id: c.id, label: c.label })));
                    }
                } catch (e) {}
            }
        });
    }, []);
    
    const availableImages = Array.from(new Set(selectedProducts.map(p => p.image).filter(Boolean))) as string[];

    const toggleCategory = (catId: string) => {
        setSelectedCategories(prev =>
            prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIds.length === 0) return alert("Нет выбранных товаров");

        setIsLoading(true);
        try {
            if (mode === "NEW") {
                if (!name.trim()) return alert("Введите название карточки");
                await createStorefrontProduct({
                    name: name.trim(),
                    image: image || undefined,
                    productIds: selectedIds,
                    categories: selectedCategories
                });
            } else {
                if (!selectedStorefrontId) return alert("Выберите существующую карточку");
                await addProductsToStorefront(selectedStorefrontId, selectedIds);
            }
            onSuccess();
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Ошибка");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                    <h2 className="text-xl font-bold">Создать карточку Витрины</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-black">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
                    <div className="bg-blue-50 p-3 rounded border border-blue-100 mb-4 text-sm text-blue-800">
                        Выбрано товаров (размеров): <strong>{selectedIds.length}</strong>. 
                        Они будут привязаны к этой единой карточке на витрине.
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setMode("NEW")}
                            className={`flex-1 py-2 text-sm font-bold rounded-md flex justify-center items-center gap-2 transition-colors ${mode === "NEW" ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                        >
                            <Plus className="w-4 h-4" /> Создать новую
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("EXISTING")}
                            className={`flex-1 py-2 text-sm font-bold rounded-md flex justify-center items-center gap-2 transition-colors ${mode === "EXISTING" ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}
                        >
                            <LogIn className="w-4 h-4" /> Добавить в готовую
                        </button>
                    </div>

                    {mode === "NEW" ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Единое название (без размеров) *
                                </label>
                                <input
                                    type="text"
                                    required={mode === "NEW"}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                                    placeholder="Например: Платье летнее красное"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Рекомендуем удалить размер из названия (он будет отображаться при выборе).
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Признак / Категория на сайте (Платья, Брюки и т.д.)
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {categoriesList.map(cat => {
                                        const isSelected = selectedCategories.includes(cat.id);
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => toggleCategory(cat.id)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 transition-all ${
                                                    isSelected
                                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                        : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                                                }`}
                                            >
                                                {isSelected && <Check className="w-3 h-3" />}
                                                {cat.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Главное фото карточки</label>
                                {availableImages.length > 0 ? (
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {availableImages.map((img, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => setImage(img)}
                                                className={`shrink-0 w-20 h-20 rounded border-2 cursor-pointer overflow-hidden ${image === img ? 'border-blue-600' : 'border-transparent'}`}
                                            >
                                                <img src={img} alt="choice" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={image}
                                        onChange={e => setImage(e.target.value)}
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="Base64 или URL"
                                    />
                                )}
                                <p className="text-xs text-gray-500 mt-1">Кликом выберите фото из прикрепленных к размерам.</p>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Выберите карточку витрины *
                            </label>
                            <select
                                required={mode === "EXISTING"}
                                value={selectedStorefrontId || ""}
                                onChange={e => setSelectedStorefrontId(Number(e.target.value))}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="" disabled>-- Выберите карточку --</option>
                                {storefronts.map(sf => (
                                    <option key={sf.id} value={sf.id}>
                                        {sf.name} ({sf.products?.length || 0} тов.)
                                    </option>
                                ))}
                            </select>
                            {storefronts.length === 0 && (
                                <p className="text-xs text-red-500 mt-1">Сначала создайте хотя бы одну карточку витрины.</p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
                            disabled={isLoading}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Создать
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { X, Loader2, Tag } from "lucide-react";
import { applyStorefrontDiscounts } from "@/app/actions";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    selectedIds: number[];
    onSuccess: () => void;
}

export default function DiscountStorefrontModal({ isOpen, onClose, selectedIds, onSuccess }: Props) {
    const [discountPrice, setDiscountPrice] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleApply = async () => {
        setIsSaving(true);
        const price = discountPrice ? parseFloat(discountPrice) : null;
        
        try {
            const res = await applyStorefrontDiscounts(selectedIds, price);
            if (res.success) {
                onSuccess();
            } else {
                alert(res.error);
            }
        } catch (error) {
            alert("Ошибка сети");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm("Убрать скидку с выбранных карточек?")) return;
        setIsSaving(true);
        try {
            const res = await applyStorefrontDiscounts(selectedIds, null);
            if (res.success) {
                onSuccess();
            } else {
                alert(res.error);
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <Tag className="w-5 h-5" />
                        <h2 className="text-lg font-bold">Настроить скидку</h2>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-6">
                        Новая цена по скидке применится к {selectedIds.length} выделенным карточкам. 
                        На сайте старая цена будет зачеркнута, а красным будет гореть эта цена со скидкой.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Новая цена со скидкой (₸)
                            </label>
                            <input 
                                type="number" 
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="Например: 15000"
                                value={discountPrice}
                                onChange={e => setDiscountPrice(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row justify-between gap-3">
                        <button
                            onClick={handleRemove}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                            Убрать скидки
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={isSaving || !discountPrice}
                                className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 rounded-lg shadow-sm transition"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Применить
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

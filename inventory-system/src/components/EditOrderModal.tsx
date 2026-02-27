"use client";

import { useState } from "react";
import { Loader2, X, Plus, Search, Trash2, ShoppingBag, Upload } from "lucide-react";
import { format } from "date-fns";
import { updateOrder, addItemToOrder, removeItemFromOrder } from "@/app/actions";
import { compressImage, formatCdekPhone, isValidCdekPhone } from "@/lib/utils";

interface Product {
    id: number;
    name: string;
    sku: string;
    size: string | null;
    price: number;
    quantity: number;
    image?: string | null;
}

interface EditOrderModalProps {
    order: any;
    products: Product[];
    onClose: () => void;
}

export default function EditOrderModal({ order, products, onClose }: EditOrderModalProps) {
    const [activeTab, setActiveTab] = useState<"details" | "items">("details");
    const [loading, setLoading] = useState(false);

    // --- Tab 1: Order Details State ---
    const [form, setForm] = useState({
        clientName: order.clientName || "",
        clientPhone: order.clientPhone?.startsWith("+7") ? order.clientPhone : (order.clientPhone ? `+7${order.clientPhone.replace(/^8?/, "")}` : "+7"),
        city: order.city || "",
        address: order.address || "", // Re-added the fallback full address
        street: order.street || "",
        house: order.house || "",
        apartment: order.apartment || "",
        postalCode: order.postalCode || "", // Added Postal Code
        comment: order.comment || "",
        deliveryMethod: order.deliveryMethod,
        paymentMethod: order.paymentMethod,
        codAmount: order.codAmount || "",
    });

    const handleSaveDetails = async () => {
        let finalizedForm = { ...form };

        if (form.deliveryMethod === "CDEK") {
            finalizedForm.clientPhone = formatCdekPhone(form.clientPhone);
            if (!isValidCdekPhone(finalizedForm.clientPhone)) {
                alert("Для СДЭК номер телефона должен быть в формате +7XXXXXXXXXX (10 цифр после +7)");
                return;
            }
        }

        if (form.deliveryMethod === "POST") {
            if (!form.clientName || !form.clientPhone || !form.city || !form.street || !form.postalCode) {
                alert("Для Казпочты обязательны: Имя, Телефон, Город, Улица и Индекс");
                return;
            }
            if (!/^\d{6}$/.test(form.postalCode)) {
                alert("Индекс Казпочты должен состоять ровно из 6 цифр");
                return;
            }
        }

        setLoading(true);
        const res = await updateOrder(order.id, finalizedForm);
        setLoading(false);
        if (res.success) {
            onClose(); // Or stay open? Let's close for now
        } else {
            alert(res.error);
        }
    };

    // --- Tab 2: Items & Stock State ---
    const [searchTerm, setSearchTerm] = useState("");
    const [isCustomMode, setIsCustomMode] = useState(false);

    // Custom Item Form
    const [customName, setCustomName] = useState("");
    const [customSize, setCustomSize] = useState("");
    const [customPrice, setCustomPrice] = useState("");
    const [customQty, setCustomQty] = useState("1");
    const [customImage, setCustomImage] = useState("");

    const filteredProducts = searchTerm
        ? products.filter(p =>
            (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sku.includes(searchTerm)) &&
            p.quantity > 0
        ).slice(0, 5)
        : [];

    const handleAddItem = async (productOrCustom: any) => {
        if (!confirm(`Добавить "${productOrCustom.name}" в заказ?`)) return;

        setLoading(true);
        const res = await addItemToOrder(order.id, {
            id: productOrCustom.id, // undefined if custom
            name: productOrCustom.name,
            sku: productOrCustom.sku,
            size: productOrCustom.size,
            price: productOrCustom.price,
            quantity: productOrCustom.quantity || 1, // Default 1 for now
            image: productOrCustom.image,
            isCustom: productOrCustom.isCustom
        });
        setLoading(false);

        if (res.error) alert(res.error);
        else {
            if (isCustomMode) {
                // Reset custom form
                setIsCustomMode(false);
                setCustomName("");
                setCustomPrice("");
                setCustomImage("");
            }
            setSearchTerm("");
        }
    };

    const handleAddCustom = () => {
        if (!customName || !customPrice) return;
        handleAddItem({
            name: customName,
            sku: "CUSTOM-" + Date.now(),
            size: customSize,
            price: parseFloat(customPrice),
            quantity: parseInt(customQty) || 1,
            image: customImage,
            isCustom: true
        });
    };

    const handleRemoveItem = async (itemId: number, name: string) => {
        if (!confirm(`Удалить "${name}" из заказа?`)) return;
        setLoading(true);
        const res = await removeItemFromOrder(order.id, itemId);
        setLoading(false);
        if (res.error) alert(res.error);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setCustomImage(compressed);
            } catch (error) {
                console.error(error);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl h-[90vh] flex flex-col shadow-xl">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold">Заказ {order.orderNumber}</h2>
                        <div className="flex gap-4 text-sm text-gray-500 mt-1">
                            <button
                                onClick={() => setActiveTab("details")}
                                className={`pb-1 border-b-2 ${activeTab === "details" ? "border-purple-600 text-purple-600 font-bold" : "border-transparent hover:text-gray-700"}`}
                            >
                                Детали
                            </button>
                            <button
                                onClick={() => setActiveTab("items")}
                                className={`pb-1 border-b-2 ${activeTab === "items" ? "border-purple-600 text-purple-600 font-bold" : "border-transparent hover:text-gray-700"}`}
                            >
                                Товары ({order.items.length})
                            </button>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === "details" ? (
                        <div className="space-y-4 max-w-md mx-auto">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Имя клиента</label>
                                <input className="w-full border p-2 rounded" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} />

                                <label className="block text-sm font-medium">Телефон</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={form.clientPhone}
                                    onChange={e => {
                                        let val = e.target.value;
                                        if (!val.startsWith("+7")) {
                                            val = "+7" + val.replace(/^\+?7?/, "");
                                        }
                                        setForm({ ...form, clientPhone: val });
                                    }}
                                />

                                <label className="block text-sm font-medium">Город</label>
                                <input className="w-full border p-2 rounded mb-2" placeholder="Город" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />

                                <label className="block text-sm font-medium">Общий адрес (строка)</label>
                                <input className="w-full border p-2 rounded mb-2" placeholder="Улица, дом, квартира" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />

                                <label className="block text-sm font-medium">ИЛИ Адрес (по частям)</label>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input className="border p-2 rounded" placeholder="Улица" value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} />
                                    <input className="border p-2 rounded" placeholder="Дом" value={form.house} onChange={e => setForm({ ...form, house: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input className="border p-2 rounded" placeholder="Квартира" value={form.apartment} onChange={e => setForm({ ...form, apartment: e.target.value })} />
                                </div>

                                <label className="block text-sm font-medium">Комментарий для курьера</label>
                                <textarea className="w-full border p-2 rounded h-20 resize-none" placeholder="Код домофона, этаж и т.д." value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} />

                                <label className="block text-sm font-medium mt-2">Доставка</label>
                                <select className="w-full border p-2 rounded mb-2" value={form.deliveryMethod} onChange={e => setForm({ ...form, deliveryMethod: e.target.value })}>
                                    <option value="PICKUP">Самовывоз</option>
                                    <option value="POST">Казпочта</option>
                                    <option value="CDEK">СДЭК</option>
                                    <option value="YANDEX">Яндекс</option>
                                    <option value="ALMATY_COURIER">Курьер (Алматы)</option>
                                </select>

                                {form.deliveryMethod === "POST" && (
                                    <>
                                        <label className="block text-sm font-medium text-gray-700">Индекс (Казпочта) *</label>
                                        <input
                                            className="w-full border-gray-300 border p-2 rounded mb-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            placeholder="000000"
                                            maxLength={6}
                                            value={form.postalCode}
                                            onChange={e => setForm({ ...form, postalCode: e.target.value })}
                                        />
                                    </>
                                )}

                                <label className="block text-sm font-medium">Оплата</label>
                                <input className="w-full border p-2 rounded" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} />
                            </div>

                            {/* History Log */}
                            <div className="mt-8 pt-4 border-t">
                                <h3 className="font-bold text-sm mb-2">История изменений</h3>
                                <div className="text-xs space-y-1 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
                                    {order.history.map((h: any) => (
                                        <div key={h.id} className="text-gray-600 border-b last:border-0 pb-1">
                                            <span className="font-mono text-gray-400 mr-2">{format(new Date(h.createdAt), "dd.MM HH:mm")}</span>
                                            <span className={`font-medium ${h.action === "ITEM_REMOVED" ? "text-red-500" : h.action === "ITEM_ADDED" ? "text-green-600" : ""}`}>
                                                {h.action}
                                            </span>: {h.details}
                                        </div>
                                    ))}
                                    {order.history.length === 0 && <div className="text-gray-400 italic">Нет записей</div>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Actions Area */}
                            <div className="bg-gray-50 p-3 rounded-lg border">
                                <h3 className="font-bold text-sm mb-2 px-1">Добавить товар</h3>
                                {isCustomMode ? (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <label className="w-20 h-20 border-2 border-dashed rounded flex items-center justify-center cursor-pointer bg-white hover:bg-gray-50">
                                                {customImage ? <img src={customImage} className="w-full h-full object-cover" /> : <Upload className="w-6 h-6 text-gray-400" />}
                                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                            </label>
                                            <div className="flex-1 space-y-2">
                                                <input placeholder="Название" className="w-full p-2 border rounded text-sm" value={customName} onChange={e => setCustomName(e.target.value)} />
                                                <div className="flex gap-2">
                                                    <input placeholder="Доступна" className="w-1/2 p-2 border rounded text-sm" value={customSize} onChange={e => setCustomSize(e.target.value)} />
                                                    <input type="number" placeholder="Цена" className="w-1/2 p-2 border rounded text-sm" value={customPrice} onChange={e => setCustomPrice(e.target.value)} />
                                                    <input type="number" placeholder="Кол-во" className="w-20 p-2 border rounded text-sm" value={customQty} onChange={e => setCustomQty(e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleAddCustom} disabled={!customName || !customPrice} className="flex-1 bg-green-600 text-white py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50">Добавить</button>
                                            <button onClick={() => setIsCustomMode(false)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-100">Отмена</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    placeholder="Поиск товара (название или SKU)..."
                                                    className="w-full pl-9 pr-4 py-2 border rounded text-sm"
                                                    value={searchTerm}
                                                    onChange={e => setSearchTerm(e.target.value)}
                                                />
                                            </div>
                                            <button onClick={() => setIsCustomMode(true)} className="px-3 bg-white border rounded text-sm hover:bg-gray-50 whitespace-nowrap">+ Свой</button>
                                        </div>

                                        {/* Dropdown */}
                                        {searchTerm && (
                                            <div className="absolute top-full left-0 right-0 bg-white border rounded-b shadow-lg mt-1 max-h-60 overflow-y-auto z-10">
                                                {filteredProducts.length === 0 ? (
                                                    <div className="p-3 text-center text-sm text-gray-500">Ничего не найдено</div>
                                                ) : (
                                                    filteredProducts.map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => handleAddItem({ ...p, quantity: 1 })}
                                                            className="w-full text-left p-2 hover:bg-purple-50 flex items-center gap-3 border-b last:border-0"
                                                        >
                                                            <div className="w-8 h-8 bg-gray-100 rounded border flex-shrink-0 relative group/img">
                                                                {p.image && <img src={p.image} className="w-full h-full object-cover rounded transition-transform duration-200 ease-in-out group-hover/img:scale-[4] group-hover/img:z-50 relative origin-left" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-sm truncate">{p.name}</div>
                                                                <div className="text-xs text-gray-500">SKU: {p.sku} | Ост: {p.quantity}</div>
                                                            </div>
                                                            <div className="font-bold text-sm">₸ {p.price}</div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Existing Items List */}
                            <div className="space-y-2">
                                {order.items.map((item: any) => (
                                    <div key={item.id} className="flex gap-3 bg-white border p-3 rounded shadow-sm items-center">
                                        <div className="w-12 h-12 bg-gray-100 rounded border flex-shrink-0 relative group/img">
                                            {item.image ? (
                                                <img src={item.image} className="w-full h-full object-cover rounded transition-transform duration-200 ease-in-out group-hover/img:scale-[4] group-hover/img:z-50 relative origin-left" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300 overflow-hidden rounded"><ShoppingBag className="w-5 h-5" /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">{item.name}</div>
                                            <div className="text-xs text-gray-500 flex gap-2">
                                                <span>Размер: {item.size || "-"}</span>
                                                <span>SKU: {item.sku}</span>
                                            </div>
                                            <div className="text-xs font-bold mt-1">
                                                {item.quantity} шт x ₸ {item.price} = ₸ {item.price * item.quantity}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.id, item.name)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Удалить и вернуть на склад"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="text-right font-bold text-lg pt-2 border-t">
                                Итого: ₸ {order.totalAmount.toLocaleString()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-white border rounded hover:bg-gray-100">Закрыть</button>
                    {activeTab === "details" && (
                        <button onClick={handleSaveDetails} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2">
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Сохранить детали
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

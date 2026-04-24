"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Search, ShoppingBag, Upload } from "lucide-react";
import { createOrder } from "@/app/actions";
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

interface CartItem {
    product: Product | {
        id?: number;
        name: string;
        sku: string;
        size: string;
        price: number;
        image?: string;
        isCustom?: boolean;
    };
    cartQty: number;
}

interface CreateOrderModalProps {
    onClose: () => void;
    isQuickSale?: boolean;
}

const DELIVERY_METHODS = [
    { value: "PICKUP", label: "Самовывоз" },
    { value: "CDEK", label: "СДЭК" },
    { value: "ALMATY_COURIER", label: "Курьер по Алматы" },
    { value: "RIKA", label: "Рика" },
    { value: "POST", label: "Казпочта" },
    { value: "YANDEX", label: "Яндекс" },
];

export default function CreateOrderModal({ onClose, isQuickSale = false }: CreateOrderModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [deliveryMethod, setDeliveryMethod] = useState("PICKUP");
    const [loading, setLoading] = useState(false);

    // Form state
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("+7");

    // Address State
    const [city, setCity] = useState("Алматы");
    const [street, setStreet] = useState("");
    const [house, setHouse] = useState("");
    const [apt, setApt] = useState("");
    const [simpleAddress, setSimpleAddress] = useState("");
    const [postalCode, setPostalCode] = useState("");

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState("");
    const [codAmount, setCodAmount] = useState("");

    // Fetch products from API as user types (debounced)
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        if (searchTerm.length < 2) {
            setFilteredProducts([]);
            return;
        }
        setIsSearching(true);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/products/search?q=${encodeURIComponent(searchTerm)}`);
                const data = await res.json();
                setFilteredProducts(data);
            } catch {
                setFilteredProducts([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, [searchTerm]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                if (existing.cartQty >= product.quantity) return prev; // Max stock reached
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, cartQty: item.cartQty + 1 }
                        : item
                );
            }
            return [...prev, { product, cartQty: 1 }];
        });
        setSearchTerm("");
    };

    // Universal Product State
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customName, setCustomName] = useState("");
    const [customSize, setCustomSize] = useState("");
    const [customPrice, setCustomPrice] = useState("");
    const [customImage, setCustomImage] = useState("");

    const handleAddCustom = () => {
        if (!customName || !customPrice) return;

        const customProduct = {
            name: customName,
            size: customSize,
            price: parseFloat(customPrice),
            sku: "CUSTOM-" + Date.now(),
            quantity: 999, // Infinite for custom
            image: customImage,
            isCustom: true
        };

        setCart(prev => [...prev, { product: customProduct, cartQty: 1 }]);

        // Reset form
        setCustomName("");
        setCustomSize("");
        setCustomPrice("");
        setCustomImage("");
        setIsCustomMode(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Compress image before setting state
                const compressedImage = await compressImage(file);
                setCustomImage(compressedImage);
            } catch (error) {
                console.error("Failed to compress image:", error);
                alert("Ошибка при обработке изображения");
            }
        }
    };

    const removeFromCart = (sku: string) => {
        setCart(prev => prev.filter(item => (item.product.sku || "CUSTOM") !== sku));
    };

    const updateQty = (sku: string, qty: number) => {
        setCart(prev => prev.map(item => {
            if ((item.product.sku || "CUSTOM") === sku) {
                const max = (item.product as any).isCustom ? 999 : (item.product as Product).quantity;
                return { ...item, cartQty: Math.min(Math.max(1, qty), max || 999) };
            }
            return item;
        }));
    };

    const handleCreate = async () => {
        if (cart.length === 0) return;
        setLoading(true);

        let finalizedPhone = customerPhone;

        if (deliveryMethod === "CDEK") {
            finalizedPhone = formatCdekPhone(customerPhone);
            if (!isValidCdekPhone(finalizedPhone)) {
                alert("Для СДЭК номер телефона должен быть в формате +7XXXXXXXXXX (10 цифр после +7)");
                setLoading(false);
                return;
            }
        }

        if (deliveryMethod === "POST") {
            if (!customerName || !customerPhone || !simpleAddress || !postalCode) {
                alert("Для Казпочты обязательны: ФИО, Телефон, Адрес и Индекс");
                setLoading(false);
                return;
            }
            if (!/^\d{6}$/.test(postalCode)) {
                alert("Индекс Казпочты должен состоять ровно из 6 цифр");
                setLoading(false);
                return;
            }
        }

        const payload = cart.map(item => ({
            id: (item.product as any).id,
            name: item.product.name,
            sku: item.product.sku,
            size: item.product.size || undefined,
            cartQty: item.cartQty,
            price: item.product.price,
            image: item.product.image || undefined,
            isCustom: (item.product as any).isCustom
        }));

        let address = simpleAddress;
        if (deliveryMethod === "CDEK") {
            address = `ул. ${street}, д. ${house}`;
            if (apt) address += `, кв/оф ${apt}`;
        }

        const customer = {
            name: customerName,
            phone: customerPhone,
            city: deliveryMethod === "CDEK" ? city : undefined,
            address: deliveryMethod === "PICKUP" ? undefined : address,
            postalCode: deliveryMethod === "POST" ? postalCode : undefined
        };

        const payment = {
            method: paymentMethod || "Не указано",
            codAmount: deliveryMethod === "CDEK" && codAmount ? parseFloat(codAmount) : undefined
        };

        const source = isQuickSale ? "SHOWROOM_POS" : "POS";

        const result = await createOrder(payload, deliveryMethod, customer, payment, source);

        if (result.success) {
            onClose();
        } else {
            alert("Ошибка: " + result.error);
        }
        setLoading(false);
    };

    const total = cart.reduce((sum, item) => sum + item.product.price * item.cartQty, 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold flex items-center">
                        <ShoppingBag className="mr-2" /> Новый заказ
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Product Selection */}
                    <div className="w-1/2 p-4 border-r flex flex-col bg-gray-50/50">
                        {isCustomMode ? (
                            <div className="flex flex-col h-full">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold">Универсальный товар</h3>
                                    <button onClick={() => setIsCustomMode(false)} className="text-gray-500 hover:text-gray-700">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="space-y-3 flex-1 overflow-y-auto">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                            <p className="text-sm text-gray-500 font-medium">Нажмите для загрузки фото</p>
                                            <p className="text-xs text-gray-400">PNG, JPG (сжатие авто)</p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </label>
                                    {customImage && (
                                        <img src={customImage} alt="Preview" className="w-full h-32 object-contain bg-white border" />
                                    )}
                                    <input
                                        type="text"
                                        placeholder="Название товара"
                                        className="w-full p-2 border rounded"
                                        value={customName}
                                        onChange={e => setCustomName(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Размер"
                                            className="w-1/2 p-2 border rounded"
                                            value={customSize}
                                            onChange={e => setCustomSize(e.target.value)}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Цена"
                                            className="w-1/2 p-2 border rounded"
                                            value={customPrice}
                                            onChange={e => setCustomPrice(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddCustom}
                                        disabled={!customName || !customPrice}
                                        className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Добавить в заказ
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-2 mb-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            placeholder="Поиск товара..."
                                            className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        onClick={() => setIsCustomMode(true)}
                                        className="bg-gray-200 px-3 rounded hover:bg-gray-300 text-sm font-medium whitespace-nowrap"
                                    >
                                        + Свой товар
                                    </button>
                                </div>

                                {!searchTerm && (
                                    <div className="text-center text-gray-400 py-10">
                                        <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p>Введите название или SKU товара</p>
                                    </div>
                                )}
                                {searchTerm.length === 1 && (
                                    <div className="text-center text-gray-400 py-4 text-sm">Введите ещё символ...</div>
                                )}
                                {isSearching && (
                                    <div className="text-center text-gray-400 py-4 text-sm">Поиск...</div>
                                )}
                                <div className="flex-1 overflow-y-auto space-y-2">
                                    {filteredProducts.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            className="w-full text-left p-2 border rounded hover:translate-x-1 hover:shadow-md transition-all flex gap-3 items-center group bg-white"
                                        >
                                            <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 border relative group/img">
                                                {product.image ? (
                                                    <img src={product.image} alt="" className="w-full h-full object-cover rounded transition-transform duration-200 ease-in-out group-hover/img:scale-[4] group-hover/img:z-50 relative origin-left" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 overflow-hidden rounded">
                                                        <ShoppingBag className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{product.name}</div>
                                                <div className="text-xs text-gray-500">
                                                    Размер: {product.size} | SKU: {product.sku}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold">₸ {product.price}</div>
                                                <div className="text-xs text-gray-500">Ост: {product.quantity}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right: Cart & Details */}
                    <div className="w-1/2 flex flex-col bg-gray-50">
                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Cart Items */}
                            <div className="space-y-2">
                                {cart.length === 0 ? (
                                    <div className="text-center text-gray-400 py-4">Корзина пуста</div>
                                ) : (
                                    cart.map(({ product, cartQty }, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-3 rounded shadow-sm">
                                            <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 border mr-3 relative group/img">
                                                {product.image ? (
                                                    <img src={product.image} alt="" className="w-full h-full object-cover rounded transition-transform duration-200 ease-in-out group-hover/img:scale-[4] group-hover/img:z-50 relative origin-left" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 overflow-hidden rounded">
                                                        <ShoppingBag className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{product.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{product.size} {(product as any).isCustom && <span className="text-blue-500 font-bold">(Свой)</span>}</div>
                                            </div>
                                            <div className="flex items-center gap-2 mx-2">
                                                <button
                                                    onClick={() => updateQty(product.sku, cartQty - 1)}
                                                    className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300"
                                                >-</button>
                                                <span className="text-sm font-bold w-4 text-center">{cartQty}</span>
                                                <button
                                                    onClick={() => updateQty(product.sku, cartQty + 1)}
                                                    className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300"
                                                >+</button>
                                            </div>
                                            <div className="text-right mr-3">
                                                <div className="text-sm font-bold">₸ {product.price * cartQty}</div>
                                            </div>
                                            <button onClick={() => removeFromCart(product.sku)} className="text-red-400 hover:text-red-600">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="border-t pt-2"></div>

                            {/* CUSTOMER INFO - Hidden for Quick Sale */}
                            {!isQuickSale && (
                                <>
                                    <div className="font-bold text-lg mb-2 pt-4 border-t">Клиент</div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">ФИО</label>
                                            <input
                                                type="text"
                                                value={customerName}
                                                onChange={e => setCustomerName(e.target.value)}
                                                className="w-full border p-2 rounded"
                                                placeholder="Иванов Иван"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Телефон 🇰🇿</label>
                                            <input
                                                type="text"
                                                value={customerPhone}
                                                onChange={e => {
                                                    let val = e.target.value;
                                                    if (!val.startsWith("+7")) {
                                                        val = "+7" + val.replace(/^\+?7?/, "");
                                                    }
                                                    setCustomerPhone(val);
                                                }}
                                                className={`w-full border p-2 rounded`}
                                                placeholder="+77771234567"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* DELIVERY & PAYMENT */}
                            {!isQuickSale && (
                                <div className="font-bold text-lg mb-2 pt-4 border-t">Доставка</div>
                            )}
                            
                            {!isQuickSale ? (
                                <select
                                    value={deliveryMethod}
                                    onChange={e => setDeliveryMethod(e.target.value)}
                                    className="w-full border p-2 rounded mb-4 font-medium"
                                >
                                    {DELIVERY_METHODS.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="font-bold text-lg mb-2 pt-4 border-t">Оплата Быстрой Продажи</div>
                            )}

                            {/* Customer Details - Render only if NOT Quick Sale */}
                            {!isQuickSale && (
                                <div className="space-y-3 bg-gray-100 p-3 rounded">
                                    <h3 className="font-bold text-sm text-gray-700">Данные доставки</h3>

                                    {deliveryMethod !== "PICKUP" && (
                                        <>
                                            {deliveryMethod === "CDEK" ? (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Город"
                                                        className="w-full p-2 border rounded text-sm"
                                                        value={city}
                                                        onChange={e => setCity(e.target.value)}
                                                    />
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Улица"
                                                            className="flex-1 p-2 border rounded text-sm"
                                                            value={street}
                                                            onChange={e => setStreet(e.target.value)}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Дом"
                                                            className="w-20 p-2 border rounded text-sm"
                                                            value={house}
                                                            onChange={e => setHouse(e.target.value)}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Кв/Оф"
                                                            className="w-16 p-2 border rounded text-sm"
                                                            value={apt}
                                                            onChange={e => setApt(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <textarea
                                                    placeholder="Адрес доставки"
                                                    className="w-full p-2 border rounded text-sm h-20"
                                                    value={simpleAddress}
                                                    onChange={e => setSimpleAddress(e.target.value)}
                                                />
                                            )}
                                        </>
                                    )}

                                    {deliveryMethod === "POST" && (
                                        <div className="mt-2">
                                            <label className="block text-sm font-medium text-gray-700">Индекс (Казпочта) *</label>
                                            <input
                                                type="text"
                                                placeholder="000000"
                                                maxLength={6}
                                                className="w-full p-2 border border-gray-300 rounded text-sm mt-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                value={postalCode}
                                                onChange={e => setPostalCode(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Payment Details */}
                            <div className="space-y-3 bg-gray-100 p-3 rounded">
                                <h3 className="font-bold text-sm text-gray-700">Оплата</h3>
                                <input
                                    type="text"
                                    placeholder="Информация об оплате (например: Kaspi, оплачено)"
                                    className="w-full p-2 border rounded text-sm"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                />

                                {deliveryMethod === "CDEK" && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm whitespace-nowrap">Наложка (СДЭК):</label>
                                            <input
                                                type="number"
                                                value={codAmount}
                                                onChange={(e) => setCodAmount(e.target.value)}
                                                className="flex-1 p-2 border rounded text-sm"
                                                placeholder="Сумма (например: доставка)"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Укажите сумму, которую клиент должен оплатить при получении (обычно доставка).
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Fixed Footer */}
                        <div className="p-4 border-t bg-white shadow-top z-10">
                            <button
                                onClick={handleCreate}
                                disabled={loading || cart.length === 0 || !customerName || !customerPhone}
                                className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center"
                            >
                                {loading ? "Создание..." : "Оформить заказ"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

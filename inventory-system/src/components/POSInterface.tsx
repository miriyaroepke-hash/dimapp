"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Trash2, CreditCard, Banknote, QrCode } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useSession } from "next-auth/react";

interface Product {
    id: number;
    name: string;
    sku: string;
    price: number;
    size: string | null;
    quantity: number;
    image?: string | null;
}

interface CartItem extends Product {
    cartQty: number;
}

export default function POSInterface({ initialProducts }: { initialProducts: Product[] }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [showScanner, setShowScanner] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    const [deliveryMethod, setDeliveryMethod] = useState("PICKUP");

    // Search logic
    useEffect(() => {
        if (!query) {
            setSearchResults([]);
            return;
        }
        const lower = query.toLowerCase();
        const results = initialProducts.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            p.sku.toLowerCase().includes(lower)
        );
        setSearchResults(results.slice(0, 5));
    }, [query, initialProducts]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item);
            }
            return [...prev, { ...product, cartQty: 1 }];
        });
        setQuery("");
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateQty = (id: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.cartQty + delta);
                return { ...item, cartQty: newQty };
            }
            return item;
        }));
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.cartQty, 0);

    // Scanner logic
    useEffect(() => {
        if (showScanner && !scannerRef.current) {
            // Dynamic import or check if window exists (client only)
            // html5-qrcode requires DOM element
            setTimeout(() => {
                const scanner = new Html5QrcodeScanner(
                    "reader",
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
                );

                scanner.render((decodedText) => {
                    // Handle scan
                    const product = initialProducts.find(p => p.sku === decodedText);
                    if (product) {
                        addToCart(product);
                        // Optional: beep sound
                    } else {
                        alert(`Товар не найден: ${decodedText}`);
                    }
                }, (error) => {
                    // ignore errors
                });
                scannerRef.current = scanner;
            }, 100);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }
        };
    }, [showScanner, initialProducts]);

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        if (!confirm("Подтвердить покупку?")) return;

        try {
            // Dynamic import to avoid server/client boundary issues if action passed directly
            // Or just import at top if typical setup
            const { createOrder } = await import("@/app/actions");

            const payload = cart.map(item => ({
                id: item.id,
                cartQty: item.cartQty,
                price: item.price,
                name: item.name,
                sku: item.sku,
                size: item.size || undefined,
                image: item.image || undefined,
                isCustom: !!(item as any).isCustom
            }));

            // match signature: cart, deliveryMethod, customer?, payment?, source?
            const result = await createOrder(payload, deliveryMethod, undefined, undefined, "POS");

            if (result.success) {
                alert("Заказ успешно создан!");
                setCart([]);
            } else {
                alert("Ошибка: " + result.error);
            }
        } catch (e) {
            alert("Ошибка при оформлении заказа");
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6">
            {/* Left: Product Search & Scanner */}
            <div className="flex-1 bg-white rounded-lg shadow p-4 flex flex-col">
                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Поиск товара или сканирование..."
                            className="w-full pl-10 pr-4 py-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>
                    <button
                        onClick={() => setShowScanner(!showScanner)}
                        className={`px-4 rounded-lg bg-gray-100 hover:bg-gray-200 ${showScanner ? 'bg-blue-100 text-blue-700' : ''}`}
                    >
                        <QrCode className="w-6 h-6" />
                    </button>
                </div>

                {/* Scanner Region */}
                {showScanner && (
                    <div id="reader" className="mb-4 rounded-lg overflow-hidden border"></div>
                )}

                {/* Search Results */}
                <div className="flex-1 overflow-y-auto">
                    {searchResults.length > 0 ? (
                        <div className="space-y-2">
                            {searchResults.map(product => (
                                <div key={product.id} onClick={() => addToCart(product)} className="flex justify-between items-center p-3 border rounded cursor-pointer hover:bg-blue-50">
                                    <div>
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-sm text-gray-500">SKU: {product.sku} | Размер: {product.size}</div>
                                    </div>
                                    <div className="font-bold text-blue-600">₸{product.price}</div>
                                </div>
                            ))}
                        </div>
                    ) : query && (
                        <div className="text-center text-gray-500 mt-4">Товары не найдены</div>
                    )}
                </div>
            </div>

            {/* Right: Cart */}
            <div className="w-full lg:w-96 bg-white rounded-lg shadow flex flex-col">
                <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                    <h2 className="font-bold text-lg">Текущий заказ</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10">Корзина пуста</div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center">
                                <div className="flex-1">
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-xs text-gray-500">{item.size}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 bg-gray-200 rounded text-center">-</button>
                                    <span className="w-4 text-center">{item.cartQty}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 bg-gray-200 rounded text-center">+</button>
                                </div>
                                <div className="w-20 text-right font-medium">₸{item.price * item.cartQty}</div>
                                <button onClick={() => removeFromCart(item.id)} className="text-red-500 ml-2"><Trash2 size={16} /></button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 rounded-b-lg">
                    <div className="flex justify-between text-xl font-bold mb-4">
                        <span>Итого</span>
                        <span>₸{total.toLocaleString()}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Способ доставки</label>
                            <select
                                value={deliveryMethod}
                                onChange={(e) => setDeliveryMethod(e.target.value)}
                                className="w-full border rounded p-2"
                            >
                                <option value="PICKUP">Самовывоз (Магазин)</option>
                                <option value="CDEK">СДЭК</option>
                                <option value="ALMATY_COURIER">Курьер по Алматы</option>
                                <option value="RIKA">Рика</option>
                                <option value="POST">Почта</option>
                                <option value="YANDEX">Яндекс</option>
                            </select>
                        </div>
                        <button onClick={handleCheckout} className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-bold col-span-2">
                            <Banknote /> Оплатить ({deliveryMethod === 'PICKUP' ? 'Наличные/Карта' : 'Создать Заказ'})
                        </button>
                        {/* <button className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-bold">
                     <CreditCard /> Card
                  </button> */}
                    </div>
                </div>
            </div>
        </div>
    );
}

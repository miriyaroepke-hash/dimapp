"use client";

import { useState, useRef, useEffect } from "react";
import { Search, CheckCircle, XCircle, ArrowRightLeft, Trash2, Camera } from "lucide-react";
import { syncInventory } from "@/app/actions";
import BarcodeScanner from "./BarcodeScanner";

interface Product {
    id: number;
    name: string;
    sku: string;
    size: string | null;
    quantity: number;
    quantityShowroom: number;
}

interface ScannedItem {
    sku: string;
    name: string;
    size: string | null;
    scannedQty: number;
    systemQty: number;
}

interface Props {
    systemStock: Product[];
}

export default function StockCheck({ systemStock }: Props) {
    const [scanInput, setScanInput] = useState("");
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
    const [isCompared, setIsCompared] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [editingSku, setEditingSku] = useState<string | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [location, setLocation] = useState<"WAREHOUSE" | "SHOWROOM">("WAREHOUSE");

    const stockMap = useRef(new Map<string, Product>());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        systemStock.forEach(p => {
            stockMap.current.set(p.sku, p);
        });
    }, [systemStock]);

    const addItem = (sku: string, product?: Product) => {
        setScannedItems(prev => {
            const existing = prev.find(item => item.sku === sku);
            if (existing) {
                return prev.map(item =>
                    item.sku === sku ? { ...item, scannedQty: existing.scannedQty + 1 } : item
                );
            } else {
                return [{
                    sku,
                    name: product ? product.name : "Неизвестный товар",
                    size: product ? product.size : null,
                    scannedQty: 1,
                    systemQty: product ? (location === "WAREHOUSE" ? product.quantity : product.quantityShowroom) : 0
                }, ...prev];
            }
        });
    };

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        const input = scanInput.trim();
        if (!input) return;

        const productBySku = stockMap.current.get(input);
        if (productBySku) {
            addItem(productBySku.sku, productBySku);
            setScanInput("");
            setShowSuggestions(false);
            return;
        }

        if (/^\d{8,14}$/.test(input)) {
            addItem(input);
            setScanInput("");
            setShowSuggestions(false);
            return;
        }
    };

    const handleManualSelect = (product: Product) => {
        addItem(product.sku, product);
        setScanInput("");
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const handleCompare = () => setIsCompared(true);

    const handleReset = () => {
        if (confirm("Сбросить текущую проверку?")) {
            setScannedItems([]);
            setIsCompared(false);
        }
    };

    const handleLocationToggle = (newLoc: "WAREHOUSE" | "SHOWROOM") => {
        if (scannedItems.length > 0) {
            if (!confirm("Внимание: Смена склада сбросит уже отсканированные товары! Продолжить?")) return;
        }
        setScannedItems([]);
        setIsCompared(false);
        setLocation(newLoc);
    };

    const handleSync = async () => {
        if (!confirm("ВНИМАНИЕ: Это действие обновит остатки!\n\n- Отсканированные товары будут обновлены.\n- Неотсканированные будут обнулены.\n\nПродолжить?")) return;

        const updates = scannedItems
            .filter(item => item.systemQty >= 0 || stockMap.current.has(item.sku))
            .map(item => ({ sku: item.sku, quantity: item.scannedQty }));

        const result = await syncInventory(updates, location);

        if (result.success) {
            alert("Остатки успешно обновлены!");
            setScannedItems([]);
            setIsCompared(false);
            setScanInput("");
            window.location.reload();
        } else {
            alert("Ошибка при обновлении: " + result.error);
        }
    };

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            {/* Top Controls */}
            <div className="bg-white p-4 rounded shadow flex flex-col gap-4 shrink-0 z-20 relative">
                {/* Location Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-lg self-start">
                    <button
                        onClick={() => handleLocationToggle("WAREHOUSE")}
                        className={`px-6 py-2 rounded-md font-bold text-sm transition-colors ${location === "WAREHOUSE" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Склад
                    </button>
                    <button
                        onClick={() => handleLocationToggle("SHOWROOM")}
                        className={`px-6 py-2 rounded-md font-bold text-sm transition-colors ${location === "SHOWROOM" ? "bg-white shadow text-purple-600" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Шоурум
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between items-center w-full">
                    <div className="relative flex-1 w-full md:w-auto">
                        <form onSubmit={handleScan} className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Сканируйте штрихкод или введите название..."
                                value={scanInput}
                                onChange={(e) => {
                                    setScanInput(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                ref={inputRef}
                                autoFocus
                                className="w-full pl-10 pr-12 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setIsScannerOpen(true)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 p-1 hover:bg-blue-50 rounded"
                                title="Сканировать камерой"
                            >
                                <Camera className="w-5 h-5" />
                            </button>
                        </form>

                        {showSuggestions && scanInput.length > 1 && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-60 overflow-y-auto z-50">
                                {systemStock
                                    .filter(p =>
                                        p.name.toLowerCase().includes(scanInput.toLowerCase()) ||
                                        p.sku.includes(scanInput) ||
                                        (p.size && p.size.toLowerCase().includes(scanInput.toLowerCase()))
                                    )
                                    .slice(0, 10)
                                    .map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleManualSelect(product)}
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-0 flex justify-between items-center"
                                        >
                                            <div>
                                                <div className="font-medium text-sm">{product.name}</div>
                                                <div className="text-xs text-gray-500">Размер: {product.size || "-"}</div>
                                            </div>
                                            <div className="text-xs font-mono text-gray-400">{product.sku}</div>
                                        </button>
                                    ))
                                }
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleCompare}
                            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
                        >
                            <ArrowRightLeft className="mr-2 w-5 h-5" />
                            Сверка
                        </button>

                        {isCompared && (
                            <button
                                onClick={handleSync}
                                className="flex items-center px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold animate-pulse"
                                title="Применить результаты инвентаризации"
                            >
                                <CheckCircle className="mr-2 w-5 h-5" />
                                Применить
                            </button>
                        )}

                        <button
                            onClick={handleReset}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded border border-red-200"
                        >
                            Сброс
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
                {/* Left Column: System Stock */}
                <div className="flex-1 bg-white rounded shadow flex flex-col overflow-hidden">
                    <div className={`p-3 border-b font-bold flex justify-between ${location === "WAREHOUSE" ? "bg-blue-50 text-blue-900" : "bg-purple-50 text-purple-900"}`}>
                        <span>По системе: {location === "WAREHOUSE" ? "Склад" : "Шоурум"} ({systemStock.reduce((acc, p) => acc + (location === "WAREHOUSE" ? p.quantity : p.quantityShowroom), 0)})</span>
                        <span className="text-xs opacity-70">Остаток &gt; 0</span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2">Товар</th>
                                    <th className="px-4 py-2">SKU</th>
                                    <th className="px-4 py-2 text-right">Ост.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {systemStock
                                    .filter(p => (location === "WAREHOUSE" ? p.quantity : p.quantityShowroom) > 0 || scannedItems.some(s => s.sku === p.sku))
                                    .map(p => {
                                        const qty = location === "WAREHOUSE" ? p.quantity : p.quantityShowroom;
                                        let statusColor = "";
                                        if (isCompared) {
                                            const scanned = scannedItems.find(s => s.sku === p.sku);
                                            const scannedQty = scanned ? scanned.scannedQty : 0;
                                            if (scannedQty === qty) statusColor = "bg-green-50";
                                            else if (scannedQty < qty) statusColor = "bg-red-50";
                                            else statusColor = "bg-yellow-50";
                                        }
                                        return (
                                            <tr key={p.id} className={statusColor}>
                                                <td className="px-4 py-2">
                                                    <div className="font-medium">{p.name}</div>
                                                    <div className="text-xs text-gray-500">{p.size}</div>
                                                </td>
                                                <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                                                <td className="px-4 py-2 text-right font-bold">{qty}</td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Scanned / Actual */}
                <div className="flex-1 bg-white rounded shadow flex flex-col overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b font-bold text-gray-700 flex justify-between">
                        <span>Фактически ({scannedItems.reduce((a, b) => a + b.scannedQty, 0)})</span>
                        {isCompared && (
                            <div className="flex gap-2 text-xs">
                                <span className="text-green-600 flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> Совпало</span>
                                <span className="text-red-500 flex items-center"><XCircle className="w-3 h-3 mr-1" /> Расхождение</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {scannedItems.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                Сканируйте товары...
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2">Товар</th>
                                        <th className="px-4 py-2">SKU</th>
                                        <th className="px-4 py-2 text-right">Факт</th>
                                        {isCompared && <th className="px-4 py-2 text-right">Разн.</th>}
                                        <th className="px-4 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {scannedItems.map((item, idx) => {
                                        const diff = item.scannedQty - item.systemQty;
                                        const statusColor = isCompared ? (diff === 0 ? "bg-green-50" : "bg-red-50") : "";
                                        const isEditing = editingSku === item.sku;

                                        return (
                                            <tr key={`${item.sku}-${idx}`} className={statusColor}>
                                                <td className="px-4 py-2">
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="text-xs text-gray-500">{item.size}</div>
                                                </td>
                                                <td className="px-4 py-2 font-mono text-xs">{item.sku}</td>
                                                <td className="px-4 py-2 text-right font-bold w-24">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            className="w-16 px-1 border rounded text-right"
                                                            value={item.scannedQty}
                                                            autoFocus
                                                            onFocus={(e) => e.target.select()}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                setScannedItems(prev => prev.map(p =>
                                                                    p.sku === item.sku ? { ...p, scannedQty: val } : p
                                                                ));
                                                            }}
                                                            onBlur={() => setEditingSku(null)}
                                                            onKeyDown={(e) => { if (e.key === "Enter") setEditingSku(null); }}
                                                        />
                                                    ) : (
                                                        <div
                                                            onClick={() => setEditingSku(item.sku)}
                                                            className="cursor-pointer hover:bg-gray-100 px-2 rounded"
                                                            title="Нажмите для изменения"
                                                        >
                                                            {item.scannedQty}
                                                        </div>
                                                    )}
                                                </td>
                                                {isCompared && (
                                                    <td className={`px-4 py-2 text-right font-bold ${diff !== 0 ? "text-red-600" : "text-green-600"}`}>
                                                        {diff > 0 ? `+${diff}` : diff}
                                                    </td>
                                                )}
                                                <td className="px-4 py-2 text-right">
                                                    <button
                                                        onClick={() => {
                                                            if (confirm("Удалить этот товар из списка?")) {
                                                                setScannedItems(prev => prev.filter(p => p.sku !== item.sku));
                                                            }
                                                        }}
                                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                                        title="Удалить строку"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {isScannerOpen && (
                <BarcodeScanner
                    onClose={() => setIsScannerOpen(false)}
                    onScan={(code) => {
                        const productBySku = stockMap.current.get(code);
                        if (productBySku) {
                            addItem(productBySku.sku, productBySku);
                        } else {
                            addItem(code);
                        }
                    }}
                />
            )}
        </div>
    );
}

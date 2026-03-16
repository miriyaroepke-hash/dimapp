"use client";

import { useState, useRef, useEffect } from "react";
import { Search, AlertTriangle, CheckCircle, XCircle, ArrowRightLeft, Trash2, Camera } from "lucide-react";
import { syncInventory } from "@/app/actions";
import BarcodeScanner from "./BarcodeScanner";
interface Product {
    id: number;
    name: string;
    sku: string;
    size: string | null;
    quantity: number;
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

    // Map for fast lookups
    const stockMap = useRef(new Map<string, Product>());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Initialize map
        systemStock.forEach(p => {
            // Key by SKU. If duplicates exist (same SKU diff size?), might be issue. 
            // Assuming unique SKUs for now or we just take the first.
            // Actually, products might have same SKU if not unique? 
            // In our system SKU is unique per product-variant usually.
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
                    systemQty: product ? product.quantity : 0
                }, ...prev]; // Add new items to top
            }
        });
    };

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        const input = scanInput.trim();
        if (!input) return;

        // 1. Check for exact SKU match (Scanner behavior)
        const productBySku = stockMap.current.get(input);

        if (productBySku) {
            addItem(productBySku.sku, productBySku);
            setScanInput("");
            setShowSuggestions(false);
            return;
        }

        // 2. If valid SKU but not in system (New item?)
        // Heuristic: If input is numeric and >8 chars, assume it's a barcode
        if (/^\d{8,14}$/.test(input)) {
            addItem(input); // Add as unknown
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

    const handleCompare = () => {
        setIsCompared(true);
    };

    const handleReset = () => {
        if (confirm("Сбросить текущую проверку?")) {
            setScannedItems([]);
            setIsCompared(false);
        }
    };



    const handleSync = async () => {
        if (!confirm("ВНИМАНИЕ: Это действие обновит остатки в системе!\n\n- Отсканированные товары будут обновлены.\n- Неотсканированные товары (которые есть в базе) будут обнулены.\n\nПродолжить?")) {
            return;
        }

        const updates = scannedItems
            .filter(item => item.systemQty >= 0 || stockMap.current.has(item.sku))
            .map(item => ({
                sku: item.sku,
                quantity: item.scannedQty
            }));

        const result = await syncInventory(updates);

        if (result.success) {
            alert("Остатки успешно обновлены!");
            setScannedItems([]);
            setIsCompared(false);
            setScanInput("");
            // Window reload to fetch fresh system stock is simplest, 
            // or we could depend on Next.js revalidation (which we did in action).
            // But client component props (systemStock) won't update automatically without a refresh 
            // unless we convert this to a server component that re-renders or use router.refresh().
            window.location.reload();
        } else {
            alert("Ошибка при обновлении: " + result.error);
        }
    };

    // Prepare comparison data
    // We need to show:
    // 1. Items in System but NOT scanned (Missing)
    // 2. Items Scanned (Matches or Surplus)
    // 3. Items Scanned but valid (Match)

    // Actually user asked for two lists. 
    // Left: System (>0). Right: Scanned.
    // Compare button highlights diffs.

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            {/* Top Controls */}
            <div className="bg-white p-4 rounded shadow flex flex-col md:flex-row gap-4 justify-between items-center shrink-0 z-20 relative">
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

                    {/* Autocomplete Suggestions */}
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

            <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
                {/* Left Column: System Stock */}
                <div className="flex-1 bg-white rounded shadow flex flex-col overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b font-bold text-gray-700 flex justify-between">
                        <span>По системе ({systemStock.reduce((acc, p) => acc + p.quantity, 0)})</span>
                        <span className="text-xs text-gray-500">Остаток &gt; 0</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-0">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2">Товар</th>
                                    <th className="px-4 py-2">SKU</th>
                                    <th className="px-4 py-2 text-right">Ост.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {systemStock.map(p => {
                                    // Logic for checking status if compared
                                    let statusColor = "";
                                    if (isCompared) {
                                        const scanned = scannedItems.find(s => s.sku === p.sku);
                                        const scannedQty = scanned ? scanned.scannedQty : 0;
                                        if (scannedQty === p.quantity) statusColor = "bg-green-50";
                                        else if (scannedQty < p.quantity) statusColor = "bg-red-50"; // Missing
                                        else statusColor = "bg-yellow-50"; // Surplus (unlikely for system side, but logic holds)
                                    }

                                    return (
                                        <tr key={p.id} className={statusColor}>
                                            <td className="px-4 py-2">
                                                <div className="font-medium">{p.name}</div>
                                                <div className="text-xs text-gray-500">{p.size}</div>
                                            </td>
                                            <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                                            <td className="px-4 py-2 text-right font-bold">{p.quantity}</td>
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
                    <div className="flex-1 overflow-y-auto p-0">
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
                                        let statusColor = "";
                                        let diff = item.scannedQty - item.systemQty;

                                        if (isCompared) {
                                            if (diff === 0) statusColor = "bg-green-50";
                                            else statusColor = "bg-red-50";
                                        }

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
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') setEditingSku(null);
                                                            }}
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
                            // If valid SKU logic matches
                            addItem(code);
                        }
                    }}
                />
            )}
        </div>
    );
}

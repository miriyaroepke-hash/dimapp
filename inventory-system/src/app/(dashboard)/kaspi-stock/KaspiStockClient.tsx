
"use client";

import { useState, useRef } from "react";
import { RefreshCw, GitCompare, Upload, AlertCircle, FileSpreadsheet } from "lucide-react";

type KaspiOffer = {
    sku: string;
    name: string;
    quantity: number;
};

type LocalProduct = {
    id: number;
    name: string;
    size: string | null;
    kaspiSku: string | null;
    sku: string;
    quantity: number;
    preOrderDays: number | null;
};


type DiffType = "only_kaspi" | "only_local" | "qty_mismatch" | "ok";

type CompareRow = {
    sku: string;
    kaspiName?: string;
    kaspiQty?: number;
    localName?: string;
    localSize?: string | null;
    localQty?: number;
    diff: DiffType;
};

export default function KaspiStockClient({ localProducts }: { localProducts: LocalProduct[] }) {
    const [kaspiOffers, setKaspiOffers] = useState<KaspiOffer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showOnlyDiffs, setShowOnlyDiffs] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        
        try {
            const xlsx = await import("xlsx");
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = xlsx.read(data, { type: "array" });
                    
                    if (workbook.SheetNames.length === 0) throw new Error("Excel файл пуст");
                    
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json: any[] = xlsx.utils.sheet_to_json(firstSheet);

                    const parsedOffers: KaspiOffer[] = json.map(row => {
                        // Kaspi excel format usually has: SKU, model, brand, price, PP1, PP2, etc.
                        const sku = row.SKU || row.sku || row.Артикул || "";
                        const name = row.model || row.Наименование || row.name || "Неизвестно";
                        
                        // Sum available quantities across PP columns (e.g. PP1, PP2, PP3...)
                        let totalQty = 0;
                        for (const key of Object.keys(row)) {
                            if (key.toUpperCase().startsWith("PP")) {
                                const val = row[key];
                                if (typeof val === "number") totalQty += val;
                                else if (typeof val === "string" && !isNaN(parseInt(val))) totalQty += parseInt(val);
                                // if "yes", Kaspi means available but without limit? Usually exact stock is a number.
                            }
                        }

                        return {
                            sku: sku.toString().trim(),
                            name: name.toString().trim(),
                            quantity: totalQty
                        };
                    }).filter(offer => offer.sku !== "");

                    setKaspiOffers(parsedOffers);
                    setLoaded(true);
                } catch (err: any) {
                    setError("Ошибка при разборе Excel файла: " + err.message);
                } finally {
                    setIsLoading(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                }
            };
            
            reader.onerror = () => {
                setError("Ошибка чтения файла");
                setIsLoading(false);
            };

            reader.readAsArrayBuffer(file);
        } catch (e: any) {
            setError("Ошибка загрузки библиотеки или обработки: " + e.message);
            setIsLoading(false);
        }
    };

    const handlePushStock = async () => {
        setIsPushing(true);
        try {
            const res = await fetch("/api/kaspi/push-stock", { method: "POST" });
            const data = await res.json();
            alert(data.message || data.error || "Готово");
        } catch {
            alert("Ошибка при отправке остатков");
        } finally {
            setIsPushing(false);
        }
    };

    // Build comparison map
    const compareRows: CompareRow[] = [];
    const kaspiMap = new Map<string, KaspiOffer>();
    for (const offer of kaspiOffers) {
        kaspiMap.set(offer.sku, offer);
    }

    const localMap = new Map<string, LocalProduct>();
    for (const p of localProducts) {
        if (p.kaspiSku) localMap.set(p.kaspiSku, p);
    }

    // Items in Kaspi
    for (const [sku, offer] of kaspiMap) {
        const local = localMap.get(sku);
        if (!local) {
            compareRows.push({ sku, kaspiName: offer.name, kaspiQty: offer.quantity, diff: "only_kaspi" });
        } else {
            const diff: DiffType = offer.quantity !== local.quantity ? "qty_mismatch" : "ok";
            compareRows.push({
                sku,
                kaspiName: offer.name, kaspiQty: offer.quantity,
                localName: local.name, localSize: local.size, localQty: local.quantity,
                diff
            });
        }
    }

    // Items only in local (have kaspiSku but not found in Kaspi)
    for (const [sku, local] of localMap) {
        if (!kaspiMap.has(sku)) {
            compareRows.push({
                sku,
                localName: local.name, localSize: local.size, localQty: local.quantity,
                diff: "only_local"
            });
        }
    }

    // Sort: diffs first
    const sortOrder: Record<DiffType, number> = { only_kaspi: 0, only_local: 1, qty_mismatch: 2, ok: 3 };
    compareRows.sort((a, b) => sortOrder[a.diff] - sortOrder[b.diff]);

    const displayRows = showOnlyDiffs ? compareRows.filter(r => r.diff !== "ok") : compareRows;

    const diffCount = compareRows.filter(r => r.diff !== "ok").length;
    const onlyKaspi = compareRows.filter(r => r.diff === "only_kaspi").length;
    const onlyLocal = compareRows.filter(r => r.diff === "only_local").length;
    const qtyMismatch = compareRows.filter(r => r.diff === "qty_mismatch").length;

    const diffBg: Record<DiffType, string> = {
        only_kaspi: "bg-red-50 border-l-4 border-l-red-400",
        only_local: "bg-yellow-50 border-l-4 border-l-yellow-400",
        qty_mismatch: "bg-orange-50 border-l-4 border-l-orange-400",
        ok: ""
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white p-4 rounded-lg shadow space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">Сравнение остатков Kaspi</h1>
                        {loaded && (
                            <div className="flex gap-2 flex-wrap">
                                {onlyKaspi > 0 && <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">🔴 Только в Kaspi: {onlyKaspi}</span>}
                                {onlyLocal > 0 && <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">🟡 Только у нас: {onlyLocal}</span>}
                                {qtyMismatch > 0 && <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 font-medium">🟠 Расхождение: {qtyMismatch}</span>}
                                {diffCount === 0 && <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-medium">✅ Всё совпадает</span>}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {loaded && diffCount > 0 && (
                            <button
                                onClick={() => setShowOnlyDiffs(v => !v)}
                                className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${showOnlyDiffs ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-800 hover:bg-purple-200"}`}
                            >
                                <GitCompare className="w-4 h-4" />
                                {showOnlyDiffs ? `Только различия (${diffCount})` : "Выявить различия"}
                            </button>
                        )}
                        <button
                            onClick={handlePushStock}
                            disabled={isPushing}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors"
                        >
                            <Upload className={`w-4 h-4 ${isPushing ? "animate-bounce" : ""}`} />
                            {isPushing ? "Отправка..." : "Обновить остатки в Kaspi"}
                        </button>
                        <input 
                            type="file" 
                            accept=".xls,.xlsx" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm transition-colors"
                        >
                            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                            {isLoading ? "Обработка..." : loaded ? "Загрузить другой Excel" : "Загрузить Excel-отчет Kaspi"}
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block"/>Есть в Kaspi, нет у нас (добавьте kaspiSku)</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block"/>Есть у нас, нет в Kaspi (проверьте kaspiSku)</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400 inline-block"/>Количество расходится</span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {!loaded && !isLoading && (
                <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="mb-2">Kaspi не отдает список товаров через API.</p>
                    <p className="text-sm">Скачайте Excel-отчет (Прайс-лист) в кабинете Kaspi и загрузите его сюда для сверки.</p>
                </div>
            )}

            {loaded && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b text-xs text-gray-600 uppercase">
                            <tr>
                                <th className="px-4 py-3 text-left w-8">#</th>
                                <th className="px-4 py-3 text-left">Артикул (kaspiSku)</th>
                                {/* Kaspi side */}
                                <th className="px-4 py-3 text-left bg-red-50 border-l border-red-100">📦 Kaspi — Название</th>
                                <th className="px-4 py-3 text-center bg-red-50">Кол-во</th>
                                {/* Local side */}
                                <th className="px-4 py-3 text-left bg-blue-50 border-l border-blue-100">🏪 Наш склад — Название</th>
                                <th className="px-4 py-3 text-center bg-blue-50">Размер</th>
                                <th className="px-4 py-3 text-center bg-blue-50">Кол-во</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayRows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                        {showOnlyDiffs ? "Различий не найдено ✅" : "Нет данных"}
                                    </td>
                                </tr>
                            ) : (
                                displayRows.map((row, idx) => (
                                    <tr key={row.sku} className={`hover:brightness-95 transition-all ${diffBg[row.diff]}`}>
                                        <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.sku}</td>
                                        {/* Kaspi column */}
                                        <td className="px-4 py-3 bg-red-50/50 border-l border-red-100">
                                            {row.kaspiName
                                                ? <span className="text-gray-800">{row.kaspiName}</span>
                                                : <span className="text-gray-300 italic">нет в Kaspi</span>}
                                        </td>
                                        <td className={`px-4 py-3 text-center font-bold bg-red-50/50 ${row.diff === "qty_mismatch" ? "text-orange-600" : "text-gray-700"}`}>
                                            {row.kaspiQty !== undefined ? row.kaspiQty : "—"}
                                        </td>
                                        {/* Local column */}
                                        <td className="px-4 py-3 bg-blue-50/50 border-l border-blue-100">
                                            {row.localName
                                                ? <span className="text-gray-800">{row.localName}</span>
                                                : <span className="text-gray-300 italic">нет в системе</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-gray-500 bg-blue-50/50">
                                            {row.localSize || "—"}
                                        </td>
                                        <td className={`px-4 py-3 text-center font-bold bg-blue-50/50 ${row.diff === "qty_mismatch" ? "text-orange-600" : "text-gray-700"}`}>
                                            {row.localQty !== undefined ? row.localQty : "—"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className="px-4 py-2 text-xs text-gray-400 border-t bg-gray-50">
                        Показано: {displayRows.length} из {compareRows.length} позиций
                        {" · "}Kaspi: {kaspiOffers.length} товаров
                        {" · "}Наша система (с kaspiSku): {localProducts.filter(p => p.kaspiSku).length} товаров
                    </div>
                </div>
            )}
        </div>
    );
}

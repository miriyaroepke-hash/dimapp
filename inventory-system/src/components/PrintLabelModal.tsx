"use client";

import { useState } from "react";
import { X, Printer, Tag, FileText } from "lucide-react";
import { ProductLabelData, LabelType, printLabel } from "@/lib/printLabel";

interface PrintLabelModalProps {
    products: ProductLabelData[];
    initialLabelType?: LabelType;
    onClose: () => void;
}

export default function PrintLabelModal({ products, initialLabelType = "barcode", onClose }: PrintLabelModalProps) {
    const [labelType, setLabelType] = useState<LabelType>(initialLabelType);
    const [printList, setPrintList] = useState(
        products.map(p => ({
            ...p,
            labelName: p.labelName || "",
            composition: p.composition || "",
            manufacturer: p.manufacturer || "DIMMIANI, Казахстан",
            copies: 1
        }))
    );
    const [isPrinting, setIsPrinting] = useState(false);

    const handleCopyChange = (index: number, newCopies: number) => {
        if (newCopies < 0) return;
        setPrintList(prev => {
            const newList = [...prev];
            newList[index] = { ...newList[index], copies: newCopies };
            return newList;
        });
    };

    const handleFieldChange = (index: number, field: "labelName" | "composition" | "manufacturer" | "size", value: string) => {
        setPrintList(prev => {
            const newList = [...prev];
            newList[index] = { ...newList[index], [field]: value };
            return newList;
        });
    };

    const applyCareFieldsToAll = (sourceIndex: number) => {
        const src = printList[sourceIndex];
        setPrintList(prev => prev.map(item => ({
            ...item,
            labelName: src.labelName,
            composition: src.composition,
            manufacturer: src.manufacturer,
        })));
    };

    const handlePrintAll = async () => {
        setIsPrinting(true);
        const finalProductsToPrint: ProductLabelData[] = [];
        printList.forEach(item => {
            for (let i = 0; i < item.copies; i++) {
                finalProductsToPrint.push({
                    name: item.name,
                    price: item.price,
                    sku: item.sku,
                    size: item.size,
                    labelName: item.labelName?.trim() || item.name,
                    composition: item.composition?.trim() || "—",
                    manufacturer: item.manufacturer?.trim() || "DIMMIANI, Казахстан",
                });
            }
        });

        if (finalProductsToPrint.length === 0) {
            alert("Выберите хотя бы 1 этикетку для печати");
            setIsPrinting(false);
            return;
        }

        try {
            await printLabel(finalProductsToPrint, labelType);
        } catch (e) {
            console.error("Print error:", e);
            alert("Ошибка при формировании PDF: " + (e as any).message);
        }
        setIsPrinting(false);
        onClose();
    };

    const previewItem = printList[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
                <div className="flex justify-between items-center p-4 border-b bg-gray-50 shrink-0">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Printer className="w-5 h-5 text-purple-600" />
                        Печать этикеток (40×24 мм)
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        disabled={isPrinting}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    {/* Переключатель типа этикетки */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setLabelType("barcode")}
                            className={`py-2.5 px-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                labelType === "barcode"
                                    ? "bg-white text-purple-700 shadow-sm border border-purple-200"
                                    : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            <Tag className="w-4 h-4" />
                            🏷️ Этикетка со штрихкодом
                        </button>
                        <button
                            type="button"
                            onClick={() => setLabelType("care")}
                            className={`py-2.5 px-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                labelType === "care"
                                    ? "bg-white text-amber-700 shadow-sm border border-amber-300"
                                    : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            <FileText className="w-4 h-4" />
                            🧵 Этикетка-составник (RU / KZ)
                        </button>
                    </div>

                    {/* Предпросмотр этикетки-составника */}
                    {labelType === "care" && previewItem && (
                        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 flex flex-col sm:flex-row items-center gap-4">
                            <div className="bg-white border-2 border-dashed border-gray-300 rounded-md p-3 w-full sm:w-[270px] shrink-0 shadow-sm text-[11px] leading-snug text-black font-sans space-y-1">
                                <div>
                                    <span className="font-bold">Наименование / Атауы: </span>
                                    <span>{previewItem.labelName?.trim() || previewItem.name}</span>
                                </div>
                                <div>
                                    <span className="font-bold">Размер / Өлшемі: </span>
                                    <span>{previewItem.size || "—"}</span>
                                </div>
                                <div>
                                    <span className="font-bold">Состав / Құрамы: </span>
                                    <span>{previewItem.composition?.trim() || "—"}</span>
                                </div>
                                <div>
                                    <span className="font-bold">Производитель / Өндіруші: </span>
                                    <span>{previewItem.manufacturer?.trim() || "DIMMIANI, Казахстан"}</span>
                                </div>
                            </div>
                            <div className="text-xs text-amber-900 space-y-1">
                                <div className="font-bold">Предпросмотр этикетки-составника (40×24 мм)</div>
                                <p className="text-amber-800">
                                    Ниже можно проверить или дополнить поля «Наименование / Атауы», «Состав / Құрамы» и «Производитель / Өндіруші» перед печатью. Чтобы сохранить их навсегда, укажите их в карточке товара.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Товар и данные этикетки</th>
                                    <th className="px-4 py-3 w-28">Штрихкод</th>
                                    <th className="px-4 py-3 text-right w-32">Кол-во копий</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {printList.map((item, idx) => (
                                    <tr key={`${item.sku}-${idx}`} className="hover:bg-gray-50 align-top">
                                        <td className="px-4 py-3 space-y-2">
                                            <div>
                                                <div className="font-bold text-gray-900">{item.name}</div>
                                                <div className="text-xs text-gray-500">Размер: <span className="font-semibold text-gray-700">{item.size || "-"}</span></div>
                                            </div>

                                            {labelType === "care" && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 bg-amber-50/40 p-2 rounded border border-amber-100">
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-gray-600">Наименование / Атауы</label>
                                                        <input
                                                            type="text"
                                                            className="w-full border rounded px-2 py-1 text-xs bg-white"
                                                            placeholder={item.name}
                                                            value={item.labelName}
                                                            onChange={e => handleFieldChange(idx, "labelName", e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-gray-600">Состав / Құрамы</label>
                                                        <input
                                                            type="text"
                                                            className="w-full border rounded px-2 py-1 text-xs bg-white"
                                                            placeholder="100% хлопок / 100% мақта"
                                                            value={item.composition}
                                                            onChange={e => handleFieldChange(idx, "composition", e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-gray-600">Производитель / Өндіруші</label>
                                                        <input
                                                            type="text"
                                                            className="w-full border rounded px-2 py-1 text-xs bg-white"
                                                            placeholder="DIMMIANI, Казахстан"
                                                            value={item.manufacturer}
                                                            onChange={e => handleFieldChange(idx, "manufacturer", e.target.value)}
                                                        />
                                                    </div>
                                                    {printList.length > 1 && idx === 0 && (
                                                        <div className="sm:col-span-3 flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => applyCareFieldsToAll(0)}
                                                                className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold underline"
                                                            >
                                                                Скопировать состав и наименование на все товары в списке ({printList.length})
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleCopyChange(idx, item.copies - 1)}
                                                    className="w-8 h-8 flex items-center justify-center border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                                                    disabled={item.copies <= 0}
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    className="w-12 text-center border rounded py-1"
                                                    value={item.copies}
                                                    onChange={e => handleCopyChange(idx, parseInt(e.target.value) || 0)}
                                                    onFocus={e => e.target.select()}
                                                />
                                                <button
                                                    onClick={() => handleCopyChange(idx, item.copies + 1)}
                                                    className="w-8 h-8 flex items-center justify-center border rounded bg-white hover:bg-gray-100"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t shrink-0 flex justify-between items-center">
                    <div className="text-sm font-medium text-gray-700">
                        Всего этикеток: {printList.reduce((acc, curr) => acc + curr.copies, 0)} шт.
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                            disabled={isPrinting}
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handlePrintAll}
                            disabled={isPrinting || printList.reduce((acc, curr) => acc + curr.copies, 0) === 0}
                            className={`px-6 py-2 text-white rounded font-bold flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${
                                labelType === "care" ? "bg-amber-600 hover:bg-amber-700" : "bg-purple-600 hover:bg-purple-700"
                            }`}
                        >
                            {isPrinting
                                ? "Генерация PDF..."
                                : labelType === "care"
                                ? "Печать составника (PDF)"
                                : "Печать штрихкода (PDF)"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

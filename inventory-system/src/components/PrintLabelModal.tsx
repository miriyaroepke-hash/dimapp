"use client";

import { useState } from "react";
import { X, Printer } from "lucide-react";
import { ProductLabelData, printLabel } from "@/lib/printLabel";

interface PrintLabelModalProps {
    products: ProductLabelData[];
    onClose: () => void;
}

export default function PrintLabelModal({ products, onClose }: PrintLabelModalProps) {
    // Array of objects with product data and copy count
    const [printList, setPrintList] = useState(
        products.map(p => ({ ...p, copies: 1 }))
    );
    const [isPrinting, setIsPrinting] = useState(false);

    const handleCopyChange = (index: number, newCopies: number) => {
        if (newCopies < 0) return;
        setPrintList(prev => {
            const newList = [...prev];
            newList[index].copies = newCopies;
            return newList;
        });
    };

    const handlePrintAll = async () => {
        setIsPrinting(true);
        // Expand the list based on copies
        const finalProductsToPrint: ProductLabelData[] = [];
        printList.forEach(item => {
            for (let i = 0; i < item.copies; i++) {
                finalProductsToPrint.push({
                    name: item.name,
                    price: item.price,
                    sku: item.sku,
                    size: item.size
                });
            }
        });

        if (finalProductsToPrint.length === 0) {
            alert("Выберите хотя бы 1 этикетку для печати");
            setIsPrinting(false);
            return;
        }

        try {
            await printLabel(finalProductsToPrint);
        } catch (e) {
            console.error("Print error:", e);
            alert("Ошибка при формировании PDF: " + (e as any).message);
        }
        setIsPrinting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b bg-gray-50 shrink-0">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Printer className="w-5 h-5 text-purple-600" />
                        Печать этикеток
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        disabled={isPrinting}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    <p className="text-sm text-gray-600 mb-4">
                        Укажите нужное количество копий для каждого товара. Товары с количеством "0" распечатаны не будут.
                    </p>

                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Товар</th>
                                    <th className="px-4 py-3 w-24">Штрихкод</th>
                                    <th className="px-4 py-3 text-right w-32">Кол-во этикеток</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {printList.map((item, idx) => (
                                    <tr key={`${item.sku}-${idx}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.size || "-"}</div>
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
                            className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPrinting ? "Генерация PDF..." : "Создать PDF"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

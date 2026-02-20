"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Edit, Trash2, Printer, ArrowUpDown, CheckSquare, Square } from "lucide-react";
import { printLabel } from "@/lib/printLabel";
import { deleteProducts } from "@/app/actions";

interface Product {
    id: number;
    name: string;
    sku: string;
    kaspiSku: string | null;
    size: string | null;
    price: number;
    quantity: number;
    image: string | null;
}

interface Props {
    products: Product[];
    total: number;
    currentPage: number;
    totalPages: number;
}

export default function ProductTable({ products, total, currentPage, totalPages }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sorting params from URL
    const sort = searchParams.get("sort") || "createdAt";
    const order = searchParams.get("order") || "desc";

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateParams({ q: searchTerm, page: "1" });
    };

    const handlePageChange = (page: number) => {
        updateParams({ page: page.toString() });
    };

    const handleSort = (key: string) => {
        const newOrder = sort === key && order === "asc" ? "desc" : "asc";
        updateParams({ sort: key, order: newOrder });
    };

    const updateParams = (updates: Record<string, string>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value) params.set(key, value);
            else params.delete(key);
        });
        router.push(`/inventory?${params.toString()}`);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === products.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(products.map(p => p.id));
        }
    };

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(pid => pid !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Удалить выбранные товары (${selectedIds.length})?`)) return;

        setIsDeleting(true);
        const res = await deleteProducts(selectedIds);
        setIsDeleting(false);

        if (res.success) {
            setSelectedIds([]);
            router.refresh();
        } else {
            alert(res.error);
        }
    };

    const handleBulkPrint = () => {
        const selectedProducts = products.filter(p => selectedIds.includes(p.id));
        printLabel(selectedProducts);
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Top Bar: Search & Bulk Actions */}
            <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
                <form onSubmit={handleSearch} className="flex gap-2 w-full flex-wrap md:flex-nowrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* Size Filter */}
                    <select
                        value={searchParams.get("size") || ""}
                        onChange={(e) => updateParams({ size: e.target.value, page: "1" })}
                        className="border rounded px-3 py-2 bg-white"
                    >
                        <option value="">Все размеры</option>
                        {["42", "44", "46", "48", "50", "52", "54", "56", "XS", "S", "M", "L", "XL", "XXL"].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    {/* Stock Filter */}
                    <select
                        value={searchParams.get("stock") || "positive"}
                        onChange={(e) => updateParams({ stock: e.target.value, page: "1" })}
                        className="border rounded px-3 py-2 bg-white"
                    >
                        <option value="positive">В наличии</option>
                        <option value="all">Все (вкл. 0)</option>
                    </select>
                </form>

                {selectedIds.length > 0 && (
                    <div className="flex gap-2 items-center bg-blue-50 px-3 py-1 rounded border border-blue-100">
                        <span className="text-sm font-bold text-blue-700">{selectedIds.length} выбрано</span>
                        <div className="h-4 w-px bg-blue-200 mx-2"></div>
                        <button
                            onClick={handleBulkPrint}
                            className="flex items-center gap-1 text-sm text-gray-700 hover:text-black"
                            title="Печать выбранных"
                        >
                            <Printer className="w-4 h-4" /> Печать
                        </button>
                        <button
                            onClick={() => {
                                const selectedProducts = products.filter(p => selectedIds.includes(p.id));
                                import("xlsx").then(xlsx => {
                                    const worksheet = xlsx.utils.json_to_sheet(selectedProducts.map(p => ({
                                        ID: p.id,
                                        Наименование: p.name,
                                        Штрихкод: p.sku,
                                        Размер: p.size || "",
                                        Цена: p.price,
                                        Остаток: p.quantity
                                    })));
                                    const workbook = xlsx.utils.book_new();
                                    xlsx.utils.book_append_sheet(workbook, worksheet, "Товары");
                                    xlsx.writeFile(workbook, "products_export.xlsx");
                                });
                            }}
                            className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900 ml-2"
                            title="Скачать в Excel"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> Excel
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 ml-2"
                            title="Удалить выбранные"
                        >
                            <Trash2 className="w-4 h-4" /> {isDeleting ? "..." : "Удалить"}
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 w-10">
                                <button onClick={toggleSelectAll}>
                                    {products.length > 0 && selectedIds.length === products.length ? (
                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                    ) : (
                                        <Square className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>
                            </th>
                            <th className="px-6 py-3">Фото</th>
                            <th
                                className="px-6 py-3 cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort("name")}
                            >
                                <div className="flex items-center gap-1">
                                    Наименование <ArrowUpDown className="w-3 h-3" />
                                </div>
                            </th>
                            <th className="px-6 py-3">Штрихкод</th>
                            <th className="px-6 py-3">Арт. Kaspi</th>
                            <th className="px-6 py-3">Размер</th>
                            <th
                                className="px-6 py-3 cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort("price")}
                            >
                                <div className="flex items-center gap-1">
                                    Цена <ArrowUpDown className="w-3 h-3" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort("quantity")}
                            >
                                <div className="flex items-center gap-1">
                                    Остаток <ArrowUpDown className="w-3 h-3" />
                                </div>
                            </th>
                            <th className="px-6 py-3">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                    Товары не найдены.
                                </td>
                            </tr>
                        ) : (
                            products.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleSelect(product.id)}>
                                            {selectedIds.includes(product.id) ? (
                                                <CheckSquare className="w-5 h-5 text-blue-600" />
                                            ) : (
                                                <Square className="w-5 h-5 text-gray-300" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-10 h-10 relative bg-gray-200 rounded flex-shrink-0 group/img">
                                            {product.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={product.image} alt={product.name} className="object-cover w-full h-full rounded transition-transform duration-200 ease-in-out group-hover/img:scale-[4] group-hover/img:z-50 relative origin-left" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-[10px] text-gray-500 overflow-hidden rounded">Нет</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                                    <td className="px-6 py-4 text-gray-500 font-mono text-sm">{product.sku}</td>
                                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{product.kaspiSku || "-"}</td>
                                    <td className="px-6 py-4">{product.size || "-"}</td>
                                    <td className="px-6 py-4">₸ {product.price.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${product.quantity > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                            }`}>
                                            {product.quantity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => printLabel(product)}
                                                className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                                                title="Печать"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (confirm("Удалить этот товар?")) {
                                                        await deleteProducts([product.id]);
                                                    }
                                                }}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                title="Удалить"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                        Страница {currentPage} из {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Назад
                        </button>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Вперед
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

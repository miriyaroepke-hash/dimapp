import prisma from "@/lib/prisma";
import ProductTable from "@/components/ProductTable";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; size?: string; stock?: string; sort?: string; order?: string; perPage?: string }>;
}) {
    const { q, page: pageStr, size, stock, sort, order, perPage } = await searchParams;
    const query = q || "";
    const page = Number(pageStr) || 1;
    const limit = perPage === "all" ? undefined : Number(perPage) || 10;
    const skip = limit ? (page - 1) * limit : 0;

    const where: any = {};

    if (query) {
        where.OR = [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
        ];
    }

    if (size) {
        where.size = size;
    }

    // Handle predefined stock views
    if (stock === "archived") {
        where.AND = [
            { quantity: { lte: 0 } },
            { quantityShowroom: { lte: 0 } }
        ];
    } else if (stock === "showroom") {
        where.quantityShowroom = { gt: 0 };
    } else if (stock === "positive" || !stock) {
        // default: show positive warehouse stock
        where.quantity = { gt: 0 };
    } else if (stock === "all") {
        // No filter applied for 'all'
    }

    const sortField = sort || "createdAt";
    const sortOrder = order || "desc";

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            ...(limit ? { take: limit } : {}),
            orderBy: { [sortField]: sortOrder },
        }),
        prisma.product.count({ where }),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold">Склад</h1>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/inventory/add"
                        className="flex-1 sm:flex-none justify-center items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium flex whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5 mr-1" />
                        Добавить товар
                    </Link>
                </div>
            </div>

            <ProductTable
                products={products}
                total={total}
                currentPage={page}
                totalPages={limit ? Math.ceil(total / limit) : 1}
            />
        </div>
    );
}

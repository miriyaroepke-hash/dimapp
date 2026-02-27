import prisma from "@/lib/prisma";
import ProductTable from "@/components/ProductTable";
import Link from "next/link";
import { Plus } from "lucide-react";
import SyncKaspiButton from "@/components/SyncKaspiButton";

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; size?: string; stock?: string; sort?: string; order?: string }>;
}) {
    const { q, page: pageStr, size, stock, sort, order } = await searchParams;
    const query = q || "";
    const page = Number(pageStr) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query) {
        where.OR = [
            { name: { contains: query } },
            { sku: { contains: query } },
        ];
    }

    if (size) {
        where.size = size;
    }

    // Default to positive stock unless "all" is specified
    if (stock !== "all") {
        where.quantity = { gt: 0 };
    }

    const sortField = sort || "createdAt";
    const sortOrder = order || "desc";

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortField]: sortOrder },
        }),
        prisma.product.count({ where }),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Склад</h1>
                <div className="flex gap-2">
                    <SyncKaspiButton />
                    <Link
                        href="/inventory/add"
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
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
                totalPages={Math.ceil(total / limit)}
            />
        </div>
    );
}

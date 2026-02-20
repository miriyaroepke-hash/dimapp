import prisma from "@/lib/prisma";
import ProductTable from "@/components/ProductTable";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; size?: string; stock?: string }>;
}) {
    const { q, page: pageStr, size, stock } = await searchParams;
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

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }),
        prisma.product.count({ where }),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Склад</h1>
                <Link
                    href="/inventory/add"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Добавить товар
                </Link>
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

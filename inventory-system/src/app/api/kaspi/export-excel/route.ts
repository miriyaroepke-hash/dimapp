import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            where: {
                AND: [
                    { kaspiSku: { not: null } },
                    { kaspiSku: { not: "" } }
                ]
            }
        });

        // Group by kaspiSku and aggregate quantities (same logic as XML feed)
        const groups: Record<string, {
            name: string,
            price: number,
            totalQty: number,
            maxPreOrderDays: number
        }> = {};

        products.forEach(p => {
            const sku = p.kaspiSku!.trim();
            if (p.quantity < 0) return;
            if (!groups[sku]) {
                groups[sku] = {
                    name: p.name,
                    price: p.price,
                    totalQty: 0,
                    maxPreOrderDays: 0
                };
            }
            groups[sku].totalQty += Math.max(0, p.quantity);
            groups[sku].maxPreOrderDays = Math.max(groups[sku].maxPreOrderDays, (p as any).preOrderDays || 0);
            groups[sku].price = p.price;
        });

        // Build export rows in Kaspi format: SKU, model, brand, price, PP1, PP2, PP3, PP4, PP5, preorder
        const exportData = Object.entries(groups)
            .filter(([sku, data]) => data.totalQty > 0) // Only items with positive stock
            .map(([sku, data]) => ({
            "SKU": sku,
            "model": data.name,
            "brand": "Dimmiani",
            "price": data.price,
            "PP1": 0,
            "PP2": 0,
            "PP3": data.totalQty, // Our warehouse is PP3
            "PP4": 0,
            "PP5": 0,
            "preorder": data.maxPreOrderDays > 0 ? data.maxPreOrderDays : "",
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        worksheet["!cols"] = [
            { wch: 15 }, // SKU
            { wch: 45 }, // model
            { wch: 12 }, // brand
            { wch: 10 }, // price
            { wch: 8  }, // PP1
            { wch: 8  }, // PP2
            { wch: 8  }, // PP3
            { wch: 8  }, // PP4
            { wch: 8  }, // PP5
            { wch: 10 }, // preorder
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, "Kaspi Catalog");

        const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(excelBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="kaspi_catalog_${new Date().toISOString().split("T")[0]}.xlsx"`,
            },
        });
    } catch (error: any) {
        console.error("Failed to generate Kaspi excel", error);
        return NextResponse.json({ error: "Failed to generate Excel" }, { status: 500 });
    }
}

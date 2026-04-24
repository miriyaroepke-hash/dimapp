import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
    try {
        const products = await prisma.product.findMany();

        // Halyk export format with direct links from DB
        const exportData = products
            .filter((p: any) => p.kaspiSku && p.quantity > 0)
            .map((p: any) => {
                const fullName = p.size ? `${p.name} ${p.size}` : p.name;
                return {
                    "SKU": p.kaspiSku,
                    "Name": fullName,
                    "Category": "",
                    "Price": p.price,
                    "LoanPeriod": 12,
                    "Test_pp1": p.quantity || 0,
                    "Kaspi Link": p.kaspiUrl || "",
                };
            });

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        
        worksheet["!cols"] = [
            { wch: 15 }, // SKU
            { wch: 50 }, // Name
            { wch: 15 }, // Category
            { wch: 10 }, // Price
            { wch: 12 }, // LoanPeriod
            { wch: 15 }, // Test_pp1
            { wch: 40 }, // Kaspi Link
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, "Halyk Catalog");

        const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(excelBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="halyk_catalog_${new Date().toISOString().split("T")[0]}.xlsx"`,
            },
        });
    } catch (error: any) {
        console.error("Failed to generate excel", error);
        return NextResponse.json({ error: "Failed to generate Excel" }, { status: 500 });
    }
}

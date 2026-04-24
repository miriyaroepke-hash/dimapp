import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/kaspi/push-stock
 *
 * Pushes current stock levels to Kaspi via the v2 stockInfo API.
 * Only updates products that have a kaspiSku set.
 * Kaspi also reads our XML feed periodically, but this allows immediate updates.
 */
export async function POST(request: Request) {
    const KASPI_TOKEN = process.env.KASPI_API_TOKEN;
    const KASPI_API_URL = "https://kaspi.kz/shop/api/v2";

    if (!KASPI_TOKEN) {
        return NextResponse.json({ error: "KASPI_API_TOKEN не настроен" }, { status: 500 });
    }

    try {
        // Get all products that have a kaspiSku
        const products = await prisma.product.findMany({
            where: {
                kaspiSku: { not: null }
            }
        });

        if (products.length === 0) {
            return NextResponse.json({
                success: true,
                message: "Нет товаров с артикулом Kaspi (kaspiSku). Добавьте kaspiSku в карточки товаров.",
                updated: 0
            });
        }

        // Group products by kaspiSku to sum up available quantities
        const groups: Record<string, { totalQty: number, maxPreOrderDays: number }> = {};

        products.forEach(p => {
            const sku = p.kaspiSku!.trim();
            if (p.quantity < 0) return; // Ignore negative stock
            if (!groups[sku]) {
                groups[sku] = { totalQty: 0, maxPreOrderDays: 0 };
            }
            groups[sku].totalQty += Math.max(0, p.quantity);
            groups[sku].maxPreOrderDays = Math.max(groups[sku].maxPreOrderDays, (p as any).preOrderDays || 0);
        });

        // Build the stockInfo payload for Kaspi API
        const offerStockList = Object.entries(groups).map(([sku, data]) => {
            const payload: any = { sku };
            
            if (data.maxPreOrderDays > 0) {
                payload.preOrder = data.maxPreOrderDays;
            } else {
                payload.availableQuantity = data.totalQty;
            }
            
            return payload;
        });

        const body = {
            data: {
                type: "offers",
                attributes: {
                    offerStockList
                }
            }
        };

        const response = await fetch(`${KASPI_API_URL}/offers/stockInfo/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/vnd.api+json",
                "X-Auth-Token": KASPI_TOKEN,
            },
            body: JSON.stringify(body),
        });

        const responseText = await response.text();

        if (!response.ok) {
            console.error("Kaspi stockInfo API error:", response.status, responseText);
            return NextResponse.json({
                error: `Ошибка от Kaspi: ${response.status}`,
                details: responseText
            }, { status: 502 });
        }

        return NextResponse.json({
            success: true,
            updated: products.length,
            message: `Остатки по ${products.length} товарам отправлены в Kaspi`
        });

    } catch (e: any) {
        console.error("Push stock to Kaspi error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

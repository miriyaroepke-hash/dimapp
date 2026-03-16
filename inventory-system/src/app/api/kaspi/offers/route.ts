import { NextResponse } from "next/server";

/**
 * GET /api/kaspi/offers
 * Returns all offers (products) with their current stock from Kaspi.
 */
export async function GET() {
    const KASPI_TOKEN = process.env.KASPI_API_TOKEN;
    const KASPI_API_URL = "https://kaspi.kz/shop/api/v2";

    if (!KASPI_TOKEN) {
        return NextResponse.json({ error: "KASPI_API_TOKEN не настроен" }, { status: 500 });
    }

    try {
        let allOffers: any[] = [];
        let pageNumber = 0;
        let hasMore = true;

        while (hasMore) {
            const url = new URL(`${KASPI_API_URL}/offers/`);
            url.searchParams.append("page[number]", pageNumber.toString());
            url.searchParams.append("page[size]", "100");

            const response = await fetch(url.toString(), {
                headers: {
                    "Content-Type": "application/vnd.api+json",
                    "X-Auth-Token": KASPI_TOKEN,
                },
            });

            if (!response.ok) {
                const text = await response.text();
                return NextResponse.json({
                    error: `Kaspi API error: ${response.status}`,
                    details: text
                }, { status: 502 });
            }

            const json = await response.json();
            const data = json.data || [];

            if (data.length === 0) {
                hasMore = false;
                break;
            }

            const mapped = data.map((item: any) => {
                const attrs = item.attributes || {};
                return {
                    sku: item.id, // Kaspi offer ID is the SKU
                    name: attrs.name || "",
                    quantity: attrs.availableQuantity ?? 0,
                };
            });

            allOffers = allOffers.concat(mapped);

            const totalElements = json.meta?.page?.totalElements || 0;
            if ((pageNumber + 1) * 100 >= totalElements) {
                hasMore = false;
            } else {
                pageNumber++;
            }
        }

        return NextResponse.json({ offers: allOffers });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

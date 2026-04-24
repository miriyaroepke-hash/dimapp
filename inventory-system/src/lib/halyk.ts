import prisma from "@/lib/prisma";

export interface HalykOrder {
    id: string; // The internal ID needed for orderItemDetails
    code: string; // The visible order number
    totalPrice: number;
    paymentMode: string;
    deliveryMode: string;
    status: string;
    creationDate: number;
    customer?: {
        firstName: string;
        lastName: string;
        cellPhone: string;
    };
    deliveryAddress?: {
        formattedAddress: string;
        city?: string;
    };
    entries: {
        skuCode: string;
        skuName: string;
        skuQuantity: number;
        skuPrice: number;
    }[];
}

export async function getHalykOAuthToken(): Promise<{ token: string | null, error: string | null }> {
    const clientId = process.env.HALYK_CLIENT_ID;
    const clientSecret = process.env.HALYK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return { token: null, error: "Ключи (HALYK_CLIENT_ID или SECRET) отсутствуют в настройках Vercel." };
    }

    try {
        const res = await fetch("https://halykmarket.kz/gw/auth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                grant_type: "client_credentials",
                client_id: clientId.trim(),
                client_secret: clientSecret.trim()
            }),
            cache: 'no-store'
        });

        const text = await res.text();
        if (!res.ok) {
            return { token: null, error: `Халык сервер ответил ошибкой: ${res.status} - ${text}` };
        }

        const data = JSON.parse(text);
        return { token: data.access_token, error: null };
    } catch (e: any) {
        return { token: null, error: `Внутренняя ошибка запроса: ${e.message}` };
    }
}

export async function getHalykOrders(daysBack: number = 7): Promise<HalykOrder[]> {
    const { token: HALYK_TOKEN, error: authError } = await getHalykOAuthToken();
    const HALYK_API_URL = "https://halykmarket.kz/gw/merchant/public";

    if (!HALYK_TOKEN) {
        console.error("Unable to get Halyk OAuth Token for orders:", authError);
        return [];
    }

    const dateFrom = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = new Date().toISOString().split('T')[0];

    let allOrders: any[] = [];
    let pageNumber = 0;
    let hasMore = true;

    while (hasMore) {
        try {
            const url = new URL(`${HALYK_API_URL}/order/v2`);
            url.searchParams.append("size", "50");
            url.searchParams.append("page", pageNumber.toString());
            url.searchParams.append("startDate", dateFrom);
            url.searchParams.append("endDate", dateTo);

            const response = await fetch(url.toString(), {
                headers: {
                    "Authorization": `Bearer ${HALYK_TOKEN}`,
                    "Accept": "application/json;charset=UTF-8"
                }
            });

            if (!response.ok) {
                console.error(`Halyk API Error (Orders): ${response.status}`);
                break;
            }

            const json = await response.json();
            const orders = json.content || [];

            if (orders.length === 0) {
                hasMore = false;
                break;
            }

            allOrders = allOrders.concat(orders);

            if (json.pageable && (pageNumber + 1) >= json.pageCount) {
                hasMore = false;
            } else {
                pageNumber++;
            }
        } catch (e) {
            console.error("Halyk API Exception (Orders):", e);
            hasMore = false;
        }
    }

    if (allOrders.length === 0) return [];

    // Fetch order entries in batches to get SKUs
    const orderIds = allOrders.map((o: any) => parseInt(o.id)).filter(id => !isNaN(id));
    const entriesMap = new Map<number, any[]>();

    // Chunk into 300 orders per request as per Halyk docs
    const chunkSize = 300;
    for (let i = 0; i < orderIds.length; i += chunkSize) {
        const chunk = orderIds.slice(i, i + chunkSize);
        try {
            const detailsRes = await fetch(`${HALYK_API_URL}/merchant/product/details-by-order`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${HALYK_TOKEN}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json;charset=UTF-8"
                },
                body: JSON.stringify({ orderIds: chunk })
            });

            if (detailsRes.ok) {
                const detailsJson = await detailsRes.json();
                for (const detail of detailsJson) {
                    if (detail.orderId && detail.orderItemDetails) {
                        entriesMap.set(detail.orderId, detail.orderItemDetails);
                    }
                }
            } else {
                console.error(`Halyk API Error (Entries): ${detailsRes.status}`);
            }
        } catch (e) {
            console.error("Halyk API Exception (Entries):", e);
        }
    }

    // Map into finalized HalykOrder format
    const mappedOrders: HalykOrder[] = allOrders.map((o: any) => {
        const itemDetails = entriesMap.get(parseInt(o.id)) || [];
        
        return {
            id: o.id,
            code: o.attributes?.code || "UNKNOWN",
            totalPrice: parseFloat(o.attributes?.totalPrice || 0),
            paymentMode: o.attributes?.paymentMode || "",
            deliveryMode: o.attributes?.deliveryMode || "",
            status: o.attributes?.status || "",
            creationDate: parseInt(o.attributes?.creationDate || Date.now()),
            customer: o.attributes?.customer ? {
                firstName: o.attributes.customer.firstName || "",
                lastName: o.attributes.customer.lastName || "",
                cellPhone: o.attributes.customer.cellPhone || "",
            } : undefined,
            deliveryAddress: o.attributes?.deliveryAddress ? {
                formattedAddress: o.attributes.deliveryAddress.formattedAddress || "",
                city: o.attributes.deliveryAddress.town || "",
            } : undefined,
            entries: itemDetails.map((item: any) => ({
                skuCode: item.skuCode || "UNKNOWN",
                skuName: item.skuName || "Товар Halyk",
                skuQuantity: parseInt(item.skuQuantity || "1"),
                skuPrice: parseFloat(item.skuPrice || "0"),
            }))
        };
    });

    return mappedOrders;
}

export async function generateHalykXml() {
    const products = await prisma.product.findMany({
        where: {
            AND: [
                { kaspiSku: { not: null } },
                { kaspiSku: { not: "" } }
            ]
        }
    });

    const escapeXml = (unsafe: string) => unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });

    const groups: Record<string, {
        name: string,
        price: number,
        totalQty: number,
        maxPreOrderDays: number,
        sizes: string[]
    }> = {};

    products.forEach(p => {
        const sku = p.kaspiSku!.trim();
        if (!groups[sku]) {
            groups[sku] = {
                name: p.name,
                price: p.price,
                totalQty: 0,
                maxPreOrderDays: 0,
                sizes: []
            };
        }
        if(p.size && !groups[sku].sizes.includes(p.size)) {
            groups[sku].sizes.push(p.size);
        }
        groups[sku].totalQty += Math.max(0, p.quantity);
        groups[sku].maxPreOrderDays = Math.max(groups[sku].maxPreOrderDays, (p as any).preOrderDays || 0);
        groups[sku].price = p.price;
    });

    // Формат даты как в успешном фиде: "2026-04-02 09:17"
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').slice(0, 16);

    // Числовой merchantid из HALYK_CLIENT_ID (убираем буквенный префикс HMM_)
    const merchantNumericId = (process.env.HALYK_CLIENT_ID || 'Dimmiani').replace(/^[A-Z_]+/, '');

    const offersXml = Object.entries(groups).filter(([sku, data]) => data.totalQty > 0 && data.price > 0).map(([sku, data]) => {
        // Appending the first size or generic string to ensure uniqueness
        const sizeStr = data.sizes.length > 0 ? data.sizes[0] : "";
        const nameWithSize = sizeStr && !data.name.includes(sizeStr) ? `${data.name} ${sizeStr}` : data.name;

        let stockTag = `<stock available="yes" storeId="Dimmiani_pp1" isPP="yes"`;
        if (data.maxPreOrderDays > 0) {
            stockTag += ` preOrder="${data.maxPreOrderDays}"`;
        }
        stockTag += ` stockLevel="${data.totalQty}"/>`;

        return `    <offer sku="${sku}">
      <model>${escapeXml(nameWithSize)}</model>
      <brand>Dimmiani</brand>
      <stocks>
        ${stockTag}
      </stocks>
      <price>${data.price}</price>
      <loanPeriod>12</loanPeriod>
    </offer>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="utf-8"?>
<merchant_offers xmlns="halyk_market" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" date="${dateStr}">
  <company>Dimmiani</company>
  <merchantid>${merchantNumericId}</merchantid>
  <offers>
${offersXml}
  </offers>
</merchant_offers>`;
}

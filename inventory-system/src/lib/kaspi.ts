
export interface KaspiOrder {
    id: string;
    code: string;
    totalPrice: number;
    paymentMode: string;
    state: string;
    status: string;
    creationDate: number;
    customer?: {
        id: string;
        firstName: string;
        lastName: string;
        cellPhone: string;
        name: string;
    };
    deliveryAddress?: {
        formattedAddress: string;
        city?: string;
        streetName?: string;
        streetNumber?: string;
        apartment?: string;
    };
    entries: {
        id: string;
        quantity: number;
        totalPrice: number;
        productName: string;
        productCode: string; // SKU (offer.code)
        category?: string;
    }[];
    deliveryMode: string;
    isKaspiDelivery: boolean;
    pickupPointId?: string;
}

export async function getKaspiOrders(daysBack: number = 7): Promise<KaspiOrder[]> {
    const KASPI_TOKEN = process.env.KASPI_API_TOKEN;
    const KASPI_API_URL = "https://kaspi.kz/shop/api/v2";

    if (!KASPI_TOKEN) {
        console.error("KASPI_API_TOKEN missing");
        return [];
    }

    const dateFrom = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    // User wants "Pickup" and "To Pack" (NEW, ACCEPTED). 
    // We include ARCHIVE so we can sync completed/cancelled orders to update local status
    const states = ["NEW", "SIGN_REQUIRED", "PICKUP", "DELIVERY", "KASPI_DELIVERY", "ARCHIVE"];

    let allOrders: KaspiOrder[] = [];

    for (const state of states) {
        try {
            let pageNumber = 0;
            let hasMore = true;

            while (hasMore) {
                const url = new URL(`${KASPI_API_URL}/orders`);
                url.searchParams.append("page[number]", pageNumber.toString());
                url.searchParams.append("page[size]", "50");
                url.searchParams.append("filter[orders][state]", state);
                url.searchParams.append("filter[orders][creationDate][$ge]", dateFrom.toString());
                url.searchParams.append("include[orders]", "user,entries");

                const response = await fetch(url.toString(), {
                    headers: {
                        "Content-Type": "application/vnd.api+json",
                        "X-Auth-Token": KASPI_TOKEN
                    }
                });

                if (!response.ok) {
                    console.error(`Kaspi API Error (${state}): ${response.status}`);
                    break;
                }

                const json = await response.json();
                if (!json.data || json.data.length === 0) {
                    hasMore = false;
                    continue;
                }

                const ordersData = json.data;
                const included = json.included || [];

                const findIncluded = (type: string, id: string) =>
                    included.find((inc: any) => inc.type === type && inc.id === id);

                const mappedOrders = ordersData.map((item: any) => {
                    const attrs = item.attributes;
                    const rels = item.relationships;

                    let customer = undefined;
                    if (rels.user && rels.user.data) {
                        const userInc = findIncluded("customers", rels.user.data.id) || findIncluded("users", rels.user.data.id);
                        if (userInc) {
                            customer = userInc.attributes;
                        }
                    }

                    const entriesMatches = rels.entries?.data || [];
                    const entries = entriesMatches.map((eRef: any) => {
                        const eInc = findIncluded("orderentries", eRef.id);
                        if (!eInc) return null;

                        const eAttrs = eInc.attributes;
                        const productRel = eInc.relationships?.product?.data;
                        let productCode = "UNKNOWN";

                        if (productRel) {
                            const pInc = findIncluded("products", productRel.id);
                            if (pInc) {
                                productCode = pInc.attributes.code;
                            }
                        }

                        return {
                            id: eInc.id,
                            quantity: eAttrs.quantity,
                            totalPrice: eAttrs.totalPrice,
                            productName: "Товар Kaspi",
                            productCode: productCode
                        };
                    }).filter(Boolean);

                    let deliveryAddress = undefined;
                    if (rels.deliveryAddress && rels.deliveryAddress.data) {
                        const addrInc = findIncluded("deliveryAddresses", rels.deliveryAddress.data.id);
                        if (addrInc) {
                            deliveryAddress = addrInc.attributes;
                        }
                    }

                    return {
                        id: item.id,
                        code: attrs.code,
                        totalPrice: attrs.totalPrice,
                        paymentMode: attrs.paymentMode,
                        state: attrs.state,
                        status: attrs.status,
                        creationDate: attrs.creationDate,
                        deliveryMode: attrs.deliveryMode,
                        isKaspiDelivery: attrs.isKaspiDelivery,
                        pickupPointId: attrs.pickupPointId,
                        customer: customer,
                        entries: entries,
                        deliveryAddress: deliveryAddress
                    };
                });

                allOrders = allOrders.concat(mappedOrders);

                // Check if we need to fetch another page
                const totalElements = json.meta?.page?.totalElements || 0;
                // page[number] is 0-indexed. If we mapped (pageNumber + 1) * 50 >= totalElements, we stop.
                if ((pageNumber + 1) * 50 >= totalElements) {
                    hasMore = false;
                } else {
                    pageNumber++;
                }
            }
        } catch (e) {
            console.error(`Kaspi API Exception loop (${state}):`, e);
        }
    }

    return allOrders;
}

export async function getKaspiLabel(orderId: string): Promise<string | null> {
    // This is a placeholder. 
    // Real implementation requires assembling the order first or fetching explicit waybill endpoint.
    // For now, returning null or maybe constructing a known URL pattern if exists.
    // Documentation suggests getting Waybill file content via API.
    return null;
}


const CDEK_API_URL = "https://api.cdek.ru/v2"; // Production URL
const TEST_API_URL = "https://api.edu.cdek.ru/v2"; // Test URL (optional switch)

// Use production credentials from .env
const ACCOUNT = process.env.CDEK_ACCOUNT;
const PASSWORD = process.env.CDEK_PASSWORD;

let accessToken: string | null = null;
let tokenExpiry: number = 0;

import { formatCdekPhone } from "./utils";

export async function getAccessToken() {
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    if (!ACCOUNT || !PASSWORD) {
        throw new Error("CDEK credentials not configured");
    }

    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", ACCOUNT);
    params.append("client_secret", PASSWORD);

    const response = await fetch(`${CDEK_API_URL}/oauth/token`, {
        method: "POST",
        body: params,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`CDEK Auth Failed: ${error}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    // expire in seconds, set expiry time (minus buffer)
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

    return accessToken;
}

// Helper to distribute total amount across items (avoiding rounding errors)
function distributeAmount(total: number, items: any[]) {
    if (items.length === 0) return [];

    const count = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    if (count === 0) return items.map(() => 0); // Should not happen

    let remaining = total;
    const result = [];

    // Simple distribution by quantity for now (assuming uniform-ish items or just needing to split the total)
    // Better: weight by price? For now, equal split per unit is safest if prices vary wildly, but let's try price-weighted if possible.
    // Actually, user just said "figure from nalozhka".
    // Let's do simple per-unit split.

    const amountPerUnit = Math.floor(total / count);

    return items.map((item: any) => {
        // This is per-item-line (which might have qty > 1)
        // We need payment per UNIT.
        return amountPerUnit;
    });
}

export async function getCdekCityCode(cityName: string): Promise<number | null> {
    const token = await getAccessToken();

    // Search for city in KZ
    const params = new URLSearchParams({
        city: cityName,
        country_codes: "KZ" // Keep it focused on Kazakhstan for now, or remove if international
    });

    const response = await fetch(`${CDEK_API_URL}/location/cities?${params}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) return null;

    const cities = await response.json();
    if (cities && cities.length > 0) {
        // Return the first match's code
        return cities[0].code;
    }
    return null;
}

export async function createCdekOrderPayload(order: any) {
    const token = await getAccessToken();

    // 1. Fixed Package Data
    const PACKAGE_WEIGHT_G = 700; // 0.7 kg
    const PACKAGE_LENGTH = 10;
    const PACKAGE_WIDTH = 10;
    const PACKAGE_HEIGHT = 10;

    // 2. Prepare Items
    const items = order.items.map((item: any) => {
        // Logic:
        // - Weight: Split 700g among items? Or just give them nominal weight?
        //   User said "Package size always these".
        //   API requires sum of item weights <= package weight? Usually yes.
        //   Let's split 700g by total units.
        return item;
    });

    const totalUnits = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const weightPerUnit = totalUnits > 0 ? Math.floor(PACKAGE_WEIGHT_G / totalUnits) : PACKAGE_WEIGHT_G;

    // 3. COD & Value Logic
    // User: "Proclaimed value is also figure from nalozhka"
    // User: "Payment (COD) matches nalozhka"
    // User: "VAT = 0"

    const isCod = order.codAmount && order.codAmount > 0;
    const totalCod = isCod ? order.codAmount : 0;

    // We need to calculate price per unit for CDEK payload
    // If COD, we need `payment.value` to sum up to `totalCod`.
    // If COD, we need `cost` (Declared Value) to also match `totalCod` (per user).

    // Simple distribution algorithm for "amount per unit" to handle potential rounding pennies?
    // CDEK allows float? CDEK usually takes integers or 2 decimal.
    // Let's just use raw division for now, assuming integer or close enough.

    const cdekItems = items.map((item: any, index: number) => {
        let unitPayment = 0;
        let unitCost = 100; // Declared Value: Always 100 ("объявленная стоимость это 100 тг всегда")

        if (isCod) {
            // "наша наложка без какого либо распределения"
            // Apply full COD amount to the FIRST item only.
            // Others get 0 payment. This avoids distribution logic and keeps the total correct.
            if (index === 0) {
                // If item.quantity > 1, this needs to be per UNIT.
                // So if I have 2 units of Item 1, and total COD is 10000.
                // unitPayment = 5000.
                // If items[0].quantity is 1, unitPayment = 10000.

                unitPayment = totalCod / item.quantity;
            } else {
                unitPayment = 0;
            }
        }

        return {
            name: item.name,
            ware_key: item.sku,
            payment: {
                value: unitPayment, // CDEK prefers precise float or integer? API accepts float.
                vat_sum: 0,
                vat_rate: 0
            },
            cost: unitCost, // 100 for each item unit? Or total? Let's assume per unit since CDEK multiplies by amount.
            // "Declared value is 100 tg always" -> likely total.
            // If total per line is 100, then unitCost = 100 / item.quantity.
            // If total per package is 100?
            // Safer to use a small fixed value per unit like 100. It's insurance.
            // Let's stick to 100 per unit as requested ("always 100").
            weight: weightPerUnit,
            amount: item.quantity,
            url: "" // Optional
        };
    });

    // 4. Resolve City Code
    let toLocation: any = {};

    const street = order.street || "";
    const house = order.house || "";
    const flat = order.apartment || "";

    // Construct full address string nicely
    let fullAddress = "";
    if (street || house) {
        fullAddress = `${street} ${house} ${flat}`.trim();
    } else {
        fullAddress = `${order.city || ""} ${order.address || ""}`.trim();
    }

    if (!fullAddress) {
        throw new Error("Не указан адрес получателя для СДЭК (Улица, Дом)");
    }

    toLocation = {
        address: fullAddress,
        street,
        house,
        flat
    };

    // Clean up
    if (!toLocation.street) delete toLocation.street;
    if (!toLocation.house) delete toLocation.house;
    if (!toLocation.flat) delete toLocation.flat;

    if (order.city) {
        try {
            const cityCode = await getCdekCityCode(order.city);
            if (cityCode) {
                toLocation.code = cityCode;
            }
        } catch (e) {
            console.warn("Failed to resolve city code:", e);
        }
    }

    const payload = {
        type: "1", // Online store order
        number: `${order.orderNumber}-${Math.random().toString(36).substring(2, 6)}`,
        tariff_code: 137, // Посылка склад-дверь (Parcel Warehouse-Door)
        comment: `Order ${order.orderNumber}. ${order.comment || ""}`.trim(),
        recipient: {
            name: order.clientName || "Client",
            phones: [{ number: formatCdekPhone(order.clientPhone || "") }],
        },
        from_location: {
            code: "4756", // Almaty (Verified via API)
        },
        to_location: toLocation,
        packages: [{
            number: "1",
            weight: PACKAGE_WEIGHT_G,
            length: PACKAGE_LENGTH,
            width: PACKAGE_WIDTH,
            height: PACKAGE_HEIGHT,
            items: cdekItems
        }]
    };


    console.log("CDEK PAYLOAD:", JSON.stringify(payload, null, 2));

    const response = await fetch(`${CDEK_API_URL}/orders`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log("CDEK RESPONSE:", response.status, responseText);

    if (!response.ok) {
        throw new Error(`CDEK Order Failed (${response.status}): ${responseText}`);
    }

    return JSON.parse(responseText);
}

export async function getCdekOrderState(uuid: string) {
    const token = await getAccessToken();

    // Check order info
    const response = await fetch(`${CDEK_API_URL}/orders/${uuid}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`);
    }

    return await response.json();
}

export async function getPrintLabel(uuids: string[]) {
    const token = await getAccessToken();

    // Request print form
    const response = await fetch(`${CDEK_API_URL}/print/orders`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            orders: uuids.map(uuid => ({ order_uuid: uuid })),
            copy_count: 4, // Requested by user
            format: "A4"
        })
    });

    if (!response.ok) {
        throw new Error("Failed to request print label");
    }

    const task = await response.json();
    return task.entity.uuid; // This is the print task UUID
}

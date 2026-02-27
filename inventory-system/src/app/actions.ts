"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateEAN13 } from "@/lib/utils";
import { getPrintLabel } from "@/lib/cdek";
import { getKaspiOrders } from "@/lib/kaspi";

export async function createProduct(formData: FormData) {
    const name = formData.get("name") as string;
    const price = parseFloat(formData.get("price") as string);
    const image = formData.get("image") as string; // Base64 string

    // Mass add logic
    const isMassAdd = formData.get("isMassAdd") === "true";

    if (isMassAdd) {
        const sizesToCheck = ["42", "44", "46", "48", "50", "52", "54"];

        for (const size of sizesToCheck) {
            const qtyStr = formData.get(`qty_${size}`);
            if (qtyStr) {
                const quantity = parseInt(qtyStr as string);
                if (!isNaN(quantity) && quantity > 0) {
                    const sku = generateEAN13();
                    await prisma.product.create({
                        data: {
                            name: name, // Clean name, no size suffix
                            size: size,
                            price,
                            quantity,
                            image,
                            sku,
                        },
                    });
                }
            }
        }
    } else {
        // Single product
        const quantity = parseInt(formData.get("quantity") as string);

        // Only allow creation if quantity is positive
        if (!isNaN(quantity) && quantity > 0) {
            const sku = (formData.get("sku") as string) || generateEAN13();
            const kaspiSku = (formData.get("kaspiSku") as string) || null;
            const size = (formData.get("size") as string) || null;

            await prisma.product.create({
                data: {
                    name,
                    price,
                    quantity,
                    image,
                    sku,
                    kaspiSku,
                    size
                },
            });
        }
    }

    revalidatePath("/inventory");
    redirect("/inventory");
}

export async function updateProduct(id: number, data: any) {
    try {
        await prisma.product.update({
            where: { id },
            data: {
                name: data.name,
                sku: data.sku,
                kaspiSku: data.kaspiSku || null,
                size: data.size || null,
                price: data.price,
                quantity: data.quantity,
                image: data.image
            }
        });
        revalidatePath("/inventory");
        return { success: true };
    } catch (e: any) {
        console.error("Update product error:", e);
        return { error: e.message || "Ошибка обновления товара" };
    }
}

interface CustomerDetails {
    name: string;
    phone: string;
    city?: string;
    address?: string; // Street + House + Apt
    postalCode?: string;
}

interface PaymentDetails {
    method: string;
    codAmount?: number;
}

export async function createOrder(
    cart: {
        id?: number;
        cartQty: number;
        price: number;
        name?: string;
        sku?: string;
        size?: string;
        image?: string;
        isCustom?: boolean;
    }[],
    deliveryMethod: string = "PICKUP",
    customer?: CustomerDetails,
    payment?: PaymentDetails,
    source: string = "POS"
) {
    if (cart.length === 0) return { error: "Корзина пуста" };

    try {
        const totalAmount = cart.reduce((sum, item) => sum + item.price * item.cartQty, 0);

        // Transaction to ensure atomic updates
        await prisma.$transaction(async (tx) => {
            // 1. Create Order
            const order = await tx.order.create({
                data: {
                    orderNumber: `ORD-${Date.now()}`,
                    totalAmount,
                    status: "COMPLETED", // Immediate sale
                    source,
                    deliveryMethod,
                    clientName: customer?.name,
                    clientPhone: customer?.phone,
                    city: customer?.city,
                    address: customer?.address,
                    postalCode: customer?.postalCode,

                    paymentMethod: payment?.method || "CASH",
                    codAmount: payment?.codAmount,

                    items: {
                        create: await Promise.all(cart.map(async (item) => {
                            let product = null;

                            // Only look up product if it has an ID and is NOT custom (though custom items shouldn't have ID usually)
                            if (item.id && !item.isCustom) {
                                product = await tx.product.findUnique({ where: { id: item.id } });
                            }

                            return {
                                productId: product ? product.id : null,
                                name: item.name || product?.name || "Unknown",
                                sku: item.sku || product?.sku || "CUSTOM",
                                size: item.size || product?.size || null,
                                price: item.price,
                                quantity: item.cartQty,
                                image: item.image || product?.image || null
                            };
                        }))
                    }
                }
            });

            // 2. Reduce Stock and Create Transactions for REAL products
            for (const item of cart) {
                if (item.id && !item.isCustom) {
                    // Re-fetch or check existence to be safe, but we can assume it exists if we found it above
                    // Simplified: just try update if ID exists
                    try {
                        await tx.product.update({
                            where: { id: item.id },
                            data: { quantity: { decrement: item.cartQty } }
                        });

                        await tx.transaction.create({
                            data: {
                                type: "OUT",
                                quantity: item.cartQty,
                                productId: item.id,
                                // userId: session.user.id
                            }
                        });
                    } catch (err) {
                        console.warn(`Failed to update stock for product ${item.id}:`, err);
                        // Continue? Or throw? For now continue as it might be a concurrency issue or product deleted
                        // Throwing would abort the transaction which is safer
                        throw err;
                    }
                }
            }
        });

        revalidatePath("/inventory");
        revalidatePath("/pos");
        revalidatePath("/"); // Dashboard stats
        return { success: true };
    } catch (e: any) {
        console.error("Create Order Error:", e);
        return { error: e.message || "Не удалось создать заказ" };
    }
}

export async function deleteProducts(ids: number[]) {
    try {
        await prisma.product.deleteMany({
            where: {
                id: { in: ids }
            }
        });
        revalidatePath("/inventory");
        return { success: true };
    } catch (e) {
        console.error("Delete error:", e);
        return { error: "Не удалось удалить товары" };
    }
}

export async function syncInventory(scannedItems: { sku: string; quantity: number }[]) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Update scanned items
            for (const item of scannedItems) {
                await tx.product.update({
                    where: { sku: item.sku },
                    data: { quantity: item.quantity }
                });
            }

            // 2. Zero out non-scanned items that are currently positive
            // Get all SKUs from scanned list
            const scannedSkus = scannedItems.map(i => i.sku);

            // Find products that are NOT in scannedSkus but have quantity > 0
            const productsToZero = await tx.product.findMany({
                where: {
                    sku: { notIn: scannedSkus },
                    quantity: { gt: 0 }
                }
            });

            // Update them to 0
            if (productsToZero.length > 0) {
                await tx.product.updateMany({
                    where: {
                        id: { in: productsToZero.map(p => p.id) }
                    },
                    data: { quantity: 0 }
                });
            }
        });

        revalidatePath("/inventory");
        revalidatePath("/stock-check");
        return { success: true };
    } catch (e) {
        console.error("Sync error:", e);
        return { error: "Не удалось синхронизировать остатки" };
    }
}

export async function updateOrderStatus(orderIds: number[], status: string) {
    try {
        await prisma.order.updateMany({
            where: {
                id: { in: orderIds }
            },
            data: { status }
        });
        revalidatePath("/daily-plan");
        revalidatePath("/archive");
        return { success: true };
    } catch (e: any) {
        console.error("Update Status Error:", e);
        return { error: "Не удалось обновить статус заказов" };
    }
}

import { createCdekOrderPayload } from "@/lib/cdek";

export async function createCdekOrder(orderId: number) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        });

        if (!order) throw new Error("Order not found");

        const cdekRes = await createCdekOrderPayload(order);
        const { uuid, cdek_number } = cdekRes.entity;

        // CDEK v2 is async, number might not be generated immediately.
        // If missing, use "PENDING" or UUID so UI shows something.
        const tracking = cdek_number || `WAIT-${uuid.substring(0, 8)}`;

        await prisma.order.update({
            where: { id: orderId },
            data: {
                waybillUuid: uuid,
                trackingNumber: tracking
            }
        });

        revalidatePath("/daily-plan");
        revalidatePath("/orders");
        return { success: true, trackingNumber: tracking };
    } catch (e: any) {
        console.error("CDEK Create Error:", e);
        return { error: e.message || "Ошибка создания накладной" };
    }
}

export async function updateCdekStatus(orderId: number) {
    try {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order || !order.waybillUuid) return { error: "No UUID found" };

        const { getCdekOrderState } = require("@/lib/cdek");
        const info = await getCdekOrderState(order.waybillUuid);

        console.log("CDEK STATUS INFO:", JSON.stringify(info, null, 2));

        const entity = info.entity || info.requests?.[0]; // Fallback if structure varies
        // Check for errors
        if (info.requests) {
            const lastReq = info.requests[info.requests.length - 1];
            if (lastReq.state === "INVALID") {
                const err = lastReq.errors?.[0]?.message || "Unknown CDEK error";

                // Clear the invalid CDEK data so the user can retry
                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        waybillUuid: null,
                        trackingNumber: null
                    }
                });
                revalidatePath("/orders");

                return { error: `CDEK Error (Order Reset): ${err}` };
            }
        }

        // If we have a number, save it
        if (info.entity?.cdek_number) {
            await prisma.order.update({
                where: { id: orderId },
                data: { trackingNumber: info.entity.cdek_number }
            });
            revalidatePath("/orders");
            return { success: true, trackingNumber: info.entity.cdek_number };
        }

        return { message: "Status: " + (info.entity?.statuses?.[0]?.name || "Processing") };

    } catch (e: any) {
        console.error("Update Status Error:", e);
        return { error: e.message };
    }
}


export async function updateOrder(orderId: number, data: any) {
    try {
        await prisma.$transaction(async (tx) => {
            const oldOrder = await tx.order.findUnique({ where: { id: orderId } });
            if (!oldOrder) throw new Error("Order not found");

            // Construct legacy address for display
            const fullAddress = [data.street, data.house, data.apartment].filter(Boolean).join(", ");

            await tx.order.update({
                where: { id: orderId },
                data: {
                    clientName: data.clientName,
                    clientPhone: data.clientPhone,
                    city: data.city,
                    address: fullAddress, // Update legacy/display field
                    street: data.street,
                    house: data.house,
                    apartment: data.apartment,
                    comment: data.comment,
                    deliveryMethod: data.deliveryMethod,
                    paymentMethod: data.paymentMethod,
                    codAmount: data.codAmount ? parseFloat(data.codAmount) : null,
                }
            });

            // Compare and log changes (simplified)
            const changes: string[] = [];
            if (oldOrder.clientName !== data.clientName) changes.push(`Имя: ${oldOrder.clientName} -> ${data.clientName}`);
            // if (oldOrder.address !== data.address) changes.push(`Адрес: ${oldOrder.address} -> ${data.address}`);
            if (oldOrder.street !== data.street) changes.push(`Улица: ${data.street}`);
            if (oldOrder.deliveryMethod !== data.deliveryMethod) changes.push(`Доставка: ${oldOrder.deliveryMethod} -> ${data.deliveryMethod}`);

            if (changes.length > 0) {
                await tx.orderHistory.create({
                    data: {
                        orderId,
                        action: "UPDATED",
                        details: changes.join(", ")
                    }
                });
            }
        });

        revalidatePath("/orders");
        return { success: true };
    } catch (e: any) {
        console.error("Update Order Error:", e);
        return { error: e.message || "Ошибка обновления заказа" };
    }
}

export async function addItemToOrder(orderId: number, productDetails: any) {
    try {
        await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({ where: { id: orderId } });
            if (!order) throw new Error("Order not found");

            // 1. Handle Stock (if real product)
            if (productDetails.id && !productDetails.isCustom) {
                const product = await tx.product.findUnique({ where: { id: productDetails.id } });
                if (!product) throw new Error("Product not found");

                if (product.quantity < productDetails.quantity) {
                    throw new Error(`Недостаточно товара "${product.name}" на складе`);
                }

                await tx.product.update({
                    where: { id: product.id },
                    data: { quantity: { decrement: productDetails.quantity } }
                });

                await tx.transaction.create({
                    data: {
                        type: "OUT",
                        quantity: productDetails.quantity,
                        productId: product.id,
                    }
                });
            }

            // 2. Add Item to Order
            const newItem = await tx.orderItem.create({
                data: {
                    orderId,
                    productId: productDetails.id && !productDetails.isCustom ? productDetails.id : null,
                    name: productDetails.name,
                    sku: productDetails.sku,
                    size: productDetails.size,
                    price: productDetails.price,
                    quantity: productDetails.quantity,
                    image: productDetails.image
                }
            });

            // 3. Update Order Total
            await tx.order.update({
                where: { id: orderId },
                data: {
                    totalAmount: { increment: productDetails.price * productDetails.quantity }
                }
            });

            // 4. Log History
            await tx.orderHistory.create({
                data: {
                    orderId,
                    action: "ITEM_ADDED",
                    details: `Добавлен: ${productDetails.name} (${productDetails.quantity} шт.)`
                }
            });
        });

        revalidatePath("/orders");
        return { success: true };
    } catch (e: any) {
        console.error("Add Item Error:", e);
        return { error: e.message || "Ошибка добавления товара" };
    }
}

export async function removeItemFromOrder(orderId: number, itemId: number) {
    try {
        await prisma.$transaction(async (tx) => {
            const item = await tx.orderItem.findUnique({ where: { id: itemId } });
            if (!item) throw new Error("Item not found");

            // 1. Return Stock (if real product)
            if (item.productId) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { quantity: { increment: item.quantity } }
                });

                await tx.transaction.create({
                    data: {
                        type: "IN",
                        quantity: item.quantity,
                        productId: item.productId,
                    }
                });
            }

            // 2. Remove Item
            await tx.orderItem.delete({ where: { id: itemId } });

            // 3. Update Order Total
            await tx.order.update({
                where: { id: orderId },
                data: {
                    totalAmount: { decrement: item.price * item.quantity }
                }
            });

            // 4. Log History
            await tx.orderHistory.create({
                data: {
                    orderId,
                    action: "ITEM_REMOVED",
                    details: `Удален: ${item.name} (${item.quantity} шт.)`
                }
            });
        });

        revalidatePath("/orders");
        return { success: true };
    } catch (e: any) {
        console.error("Remove Item Error:", e);
        return { error: e.message || "Ошибка удаления товара" };
    }
}

export async function generateCdekPrintUrl(orderIds: number[]) {
    try {
        const orders = await prisma.order.findMany({
            where: {
                id: { in: orderIds },
                waybillUuid: { not: null }
            },
            select: { waybillUuid: true }
        });

        if (orders.length === 0) {
            return { error: "Нет заказов с накладными СДЭК среди выбранных" };
        }

        const uuids = orders.map(o => o.waybillUuid as string);
        const taskUuid = await getPrintLabel(uuids);

        return { success: true, taskUuid };

    } catch (e: any) {
        console.error("Print Error:", e);
        return { error: e.message || "Ошибка печати" };
    }
}

export async function syncKaspiOrders() {
    try {
        const kaspiOrders = await getKaspiOrders(14); // Fetch last 14 days to catch delayed archiving
        let addedCount = 0;

        for (const kOrder of kaspiOrders) {
            // Map Status
            let status = "PENDING";
            if (kOrder.status === "ACCEPTED_BY_MERCHANT") {
                status = "PENDING";
                // If it is in delivery state, check if handed over to courier
                if (kOrder.state === "KASPI_DELIVERY" || kOrder.state === "DELIVERY") {
                    if (kOrder.kaspiDelivery?.courierTransmissionDate) {
                        status = "SHIPPED";
                    }
                }
            }

            if (kOrder.state === "PICKUP" && kOrder.status === "ACCEPTED_BY_MERCHANT") status = "READY_FOR_PICKUP";
            if (kOrder.state === "ARCHIVE" || kOrder.status === "COMPLETED") status = "ARCHIVED";
            if (kOrder.status === "CANCELLED" || kOrder.status === "CANCELLING") status = "CANCELLED";

            // Check if order exists
            const existing = await prisma.order.findUnique({
                where: { orderNumber: kOrder.code }
            });

            if (existing) {
                // If we manually finished it locally, we don't revert to Kaspi's pending stats.
                const localIsFinished = ["COMPLETED", "ARCHIVED", "CANCELLED", "RETURNED"].includes(existing.status);
                const kaspiIsPending = status === "PENDING" || status === "READY_FOR_PICKUP";

                if (localIsFinished && kaspiIsPending) {
                    continue; // Skip reverting
                }

                // If Kaspi status changed, OR if it's currently PENDING locally but Kaspi says it's COMPLETED etc.
                if (existing.status !== status) {
                    await prisma.$transaction(async (tx) => {
                        await tx.order.update({
                            where: { id: existing.id },
                            data: { status }
                        });

                        // If transitioning to CANCELLED or RETURNED from an active state, return stock
                        const wasActive = ["PENDING", "SHIPPED", "READY_FOR_PICKUP", "COMPLETED"].includes(existing.status);
                        const isCancelled = ["CANCELLED", "RETURNED"].includes(status);

                        if (wasActive && isCancelled) {
                            const items = await tx.orderItem.findMany({ where: { orderId: existing.id } });
                            for (const item of items) {
                                if (item.productId) {
                                    await tx.product.update({
                                        where: { id: item.productId },
                                        data: { quantity: { increment: item.quantity } }
                                    });
                                    await tx.transaction.create({
                                        data: { type: "IN", quantity: item.quantity, productId: item.productId }
                                    });
                                }
                            }
                        }
                    });
                }
                continue;
            }

            // If it doesn't exist, we only add it if it's NOT finished
            const finishedStatuses = ["COMPLETED", "RETURNED", "CANCELLED", "ARCHIVED", "DELIVERING"];
            if (finishedStatuses.includes(kOrder.status) || status === "ARCHIVED" || status === "CANCELLED") {
                continue;
            }

            // Map Delivery
            let deliveryMethod = "KASPI";
            if (kOrder.deliveryMode === "DELIVERY_LOCAL") deliveryMethod = "ALMATY_COURIER";
            // KASPI PICKUP is still fulfilled through Kaspi's delivery network, so we label it "KASPI" in the UI.

            // Process Items to find local product match
            const orderItemsPayload: {
                productId: number | null;
                name: string;
                quantity: number;
                price: number;
                sku: string;
                size: string | null;
            }[] = [];
            for (const entry of kOrder.entries) {
                let name = entry.productName || "Товар Kaspi";
                let size = null;
                const sku = entry.productCode;
                let productId = null;

                if (sku) {
                    const localProduct = await prisma.product.findFirst({
                        where: {
                            OR: [
                                { kaspiSku: sku },
                                { sku: sku }
                            ]
                        }
                    });
                    if (localProduct) {
                        name = localProduct.name;
                        size = localProduct.size;
                        productId = localProduct.id;
                    }
                }

                orderItemsPayload.push({
                    productId,
                    name: name,
                    quantity: entry.quantity,
                    price: entry.totalPrice / entry.quantity,
                    sku: sku,
                    size: size
                });
            }

            // Skip garbage test orders from Kaspi (where offer code is absent/UNKNOWN)
            const isDummy = orderItemsPayload.some(item => item.sku === "UNKNOWN" || item.name === "Товар Kaspi");

            if (isDummy) {
                console.log(`Skipping dummy order ${kOrder.code}`);
                continue;
            }

            // Create Order and Deduct Stock
            await prisma.$transaction(async (tx) => {
                await tx.order.create({
                    data: {
                        orderNumber: kOrder.code,
                        clientName: kOrder.customer ? `${kOrder.customer.firstName} ${kOrder.customer.lastName}` : "Kaspi Client",
                        clientPhone: kOrder.customer?.cellPhone || "",
                        city: kOrder.deliveryAddress?.city || "Almaty",
                        address: kOrder.deliveryAddress?.formattedAddress || "",
                        deliveryMethod: deliveryMethod,
                        paymentMethod: kOrder.paymentMode,
                        totalAmount: kOrder.totalPrice,
                        status: status,
                        createdAt: new Date(kOrder.creationDate),
                        source: "KASPI",
                        items: {
                            create: orderItemsPayload
                        }
                    }
                });

                // Deduct inventory
                for (const item of orderItemsPayload) {
                    if (item.productId) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { quantity: { decrement: item.quantity } }
                        });
                        await tx.transaction.create({
                            data: { type: "OUT", quantity: item.quantity, productId: item.productId }
                        });
                    }
                }
            });
            addedCount++;
        }

        revalidatePath("/daily-plan");
        revalidatePath("/kaspi");
        return { success: true, added: addedCount, total: kaspiOrders.length };
    } catch (e: any) {
        console.error("Kaspi Sync Error:", e);
        return { error: e.message || "Ошибка синхронизации" };
    }
}

export async function getKaspiLabelUrl(orderId: string): Promise<{ error?: string; url?: string }> {
    // Placeholder - Logic to get waybill would go here
    return { error: "Печать накладных Kaspi: API еще не подключен (требуется assembly)" };
}


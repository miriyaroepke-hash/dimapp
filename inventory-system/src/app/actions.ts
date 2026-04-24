"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateEAN13 } from "@/lib/utils";
import { getPrintLabel } from "@/lib/cdek";
import { getKaspiOrders } from "@/lib/kaspi";
import { getHalykOrders } from "@/lib/halyk";

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
            const preOrderDays = parseInt(formData.get("preOrderDays") as string) || 0;
    
            // Only allow creation if quantity is positive OR if it's a pre-order
            if ((!isNaN(quantity) && quantity > 0) || preOrderDays > 0) {
                const sku = (formData.get("sku") as string) || generateEAN13();
                const kaspiSku = (formData.get("kaspiSku") as string) || null;
                const size = (formData.get("size") as string) || null;
    
                await prisma.product.create({
                    data: {
                        name,
                        price,
                        quantity: Math.max(0, quantity),
                        image,
                        sku,
                        kaspiSku,
                        size,
                        preOrderDays
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
                size: data.size || null,
                price: data.price,
                quantity: data.quantity,
                quantityShowroom: data.quantityShowroom,
                image: data.image
            }
        });
        if (data.applyImageToAll && data.image) {
            await prisma.product.updateMany({
                where: { name: data.name, id: { not: id } },
                data: { image: data.image }
            });
        }
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

        let orderNumber = `ORD-${Date.now()}`;
        let telegramItems: string[] = [];

        // Transaction to ensure atomic updates
        await prisma.$transaction(async (tx) => {
            // 1. Create Order
            const order = await tx.order.create({
                data: {
                    orderNumber,
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
                            let requiresTransfer = false;

                            if (item.id && !item.isCustom) {
                                product = await tx.product.findUnique({ where: { id: item.id } });
                                if (product) {
                                    // Calculate if we need to deduct from showroom for online/normal orders
                                    if (source !== "SHOWROOM_POS" && product.quantity < item.cartQty) {
                                        // We will have to dip into showroom stock
                                        requiresTransfer = true;
                                    }
                                }
                            }

                            return {
                                productId: product ? product.id : null,
                                name: item.name || product?.name || "Unknown",
                                sku: item.sku || product?.sku || "CUSTOM",
                                size: item.size || product?.size || null,
                                price: item.price,
                                quantity: item.cartQty,
                                image: item.image || product?.image || null,
                                requiresTransfer
                            };
                        }))
                    }
                }
            });

            // 2. Reduce Stock and Create Transactions for REAL products
            for (const item of cart) {
                if (item.id && !item.isCustom) {
                    try {
                        const prod = await tx.product.findUnique({ where: { id: item.id } });
                        if (!prod) continue;

                        if (source === "SHOWROOM_POS") {
                            // Deduct from Showroom directly
                            if (prod.quantityShowroom >= item.cartQty) {
                                telegramItems.push(`- ${item.name || prod.name} (${item.size || prod.size || "-"}): ${item.cartQty} шт. (Продано из Шоурума 🛍️)`);
                            } else {
                                telegramItems.push(`- ${item.name || prod.name} (${item.size || prod.size || "-"}): ${item.cartQty} шт. (Увеличен минус в Шоуруме 🪡)`);
                            }
                            await tx.product.update({
                                where: { id: item.id },
                                data: { quantityShowroom: { decrement: item.cartQty } }
                            });
                        } else {
                            // Normal cascade
                            if (prod.quantity >= item.cartQty) {
                                telegramItems.push(`- ${item.name || prod.name} (${item.size || prod.size || "-"}): ${item.cartQty} шт. (Списано со Склада ✅)`);
                                await tx.product.update({
                                    where: { id: item.id },
                                    data: { quantity: { decrement: item.cartQty } }
                                });
                            } else if ((Math.max(0, prod.quantity) + prod.quantityShowroom) >= item.cartQty) {
                                const qtyFromWarehouse = Math.max(0, prod.quantity);
                                const qtyFromShowroom = item.cartQty - qtyFromWarehouse;
                                telegramItems.push(`- ${item.name || prod.name} (${item.size || prod.size || "-"}): ${item.cartQty} шт. (Списано из Шоурума 📦, НУЖНА ПЕРЕДАЧА)`);
                                
                                await tx.product.update({
                                    where: { id: item.id },
                                    data: { 
                                        ...(qtyFromWarehouse > 0 ? { quantity: { decrement: qtyFromWarehouse } } : {}),
                                        quantityShowroom: { decrement: qtyFromShowroom }
                                    }
                                });
                            } else {
                                telegramItems.push(`- ${item.name || prod.name} (${item.size || prod.size || "-"}): ${item.cartQty} шт. (Нет в наличии, ПОД ОТШИВ 🪡)`);
                                await tx.product.update({
                                    where: { id: item.id },
                                    data: { quantity: { decrement: item.cartQty } } // just drive warehouse negative
                                });
                            }
                        }

                        await tx.transaction.create({
                            data: {
                                type: "OUT",
                                quantity: item.cartQty,
                                productId: item.id,
                            }
                        });
                    } catch (err) {
                        console.warn(`Failed to update stock for product ${item.id}:`, err);
                        throw err;
                    }
                } else {
                    telegramItems.push(`- ${item.name || "Кастомный товар"} (${item.size || "-"}): ${item.cartQty} шт. (ПОД ОТШИВ 🪡)`);
                }
            }
        });

        // 3. Send Telegram Notification
        try {
            const clientInfo = [customer?.name, customer?.phone].filter(Boolean).join(" ");
            const fullAddress = [customer?.city, customer?.address].filter(Boolean).join(", ");
            const msg = `👨‍💻 НОВЫЙ РУЧНОЙ ЗАКАЗ (Админка)
Заказ: ${orderNumber}
Клиент: ${clientInfo || "Не указан"}
Доставка: ${deliveryMethod}${fullAddress ? ` \nКуда: ${fullAddress}` : ""}
Оплата: ${payment?.method || "CASH"}

Корзина:
${telegramItems.join("\n")}

Всего: ${totalAmount.toLocaleString("ru-RU")} ₸`;

            const { sendTelegramMessage } = await import("@/lib/telegram");
            await sendTelegramMessage(msg);
        } catch (err) {
            console.error("Telegram notification failed:", err);
        }

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

export async function syncInventory(scannedItems: { sku: string; quantity: number }[], location: "WAREHOUSE" | "SHOWROOM" = "WAREHOUSE") {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Update scanned items
            for (const item of scannedItems) {
                await tx.product.update({
                    where: { sku: item.sku },
                    data: location === "WAREHOUSE" 
                        ? { quantity: item.quantity } 
                        : { quantityShowroom: item.quantity }
                });
            }

            // 2. Zero out non-scanned items that are currently positive in the specific location
            const scannedSkus = scannedItems.map(i => i.sku);

            if (location === "WAREHOUSE") {
                const productsToZero = await tx.product.findMany({
                    where: {
                        sku: { notIn: scannedSkus },
                        quantity: { gt: 0 }
                    }
                });

                if (productsToZero.length > 0) {
                    await tx.product.updateMany({
                        where: { id: { in: productsToZero.map(p => p.id) } },
                        data: { quantity: 0 }
                    });
                }
            } else {
                const productsToZero = await tx.product.findMany({
                    where: {
                        sku: { notIn: scannedSkus },
                        quantityShowroom: { gt: 0 }
                    }
                });

                if (productsToZero.length > 0) {
                    await tx.product.updateMany({
                        where: { id: { in: productsToZero.map(p => p.id) } },
                        data: { quantityShowroom: 0 }
                    });
                }
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
                    status: data.status,
                    paymentStatus: data.paymentStatus,
                }
            });

            // Compare and log changes (simplified)
            const changes: string[] = [];
            if (oldOrder.clientName !== data.clientName) changes.push(`Имя: ${oldOrder.clientName} -> ${data.clientName}`);
            // if (oldOrder.address !== data.address) changes.push(`Адрес: ${oldOrder.address} -> ${data.address}`);
            if (oldOrder.street !== data.street) changes.push(`Улица: ${data.street}`);
            if (oldOrder.deliveryMethod !== data.deliveryMethod) changes.push(`Доставка: ${oldOrder.deliveryMethod} -> ${data.deliveryMethod}`);
            if (oldOrder.status !== data.status) changes.push(`Статус: ${oldOrder.status} -> ${data.status}`);
            if (oldOrder.paymentStatus !== data.paymentStatus) changes.push(`Статус оплаты: ${oldOrder.paymentStatus} -> ${data.paymentStatus}`);

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
                            // Log the return in order history
                            await tx.orderHistory.create({
                                data: {
                                    orderId: existing.id,
                                    action: "STATUS_CHANGE",
                                    details: `Заказ Kaspi отменён, остатки возвращены на склад`
                                }
                            });
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

            // Process Items to find local product match by kaspiSku
            const orderItemsPayload: {
                productId: number | null;
                name: string;
                quantity: number;
                price: number;
                sku: string;
                size: string | null;
            }[] = [];

            let hasAnyUnknown = true; // assume unknown until proven otherwise
            for (const entry of kOrder.entries) {
                const entryQty = entry.quantity || 1; // Protect against Kaspi sending 0
                const entryPrice = entryQty > 0 ? entry.totalPrice / entryQty : entry.totalPrice;

                let name = entry.productName || "Товар Kaspi";
                let size = null;
                const sku = entry.productCode || "UNKNOWN";
                let productId = null;

                if (sku && sku !== "UNKNOWN") {
                    hasAnyUnknown = false;
                    // First: try matching via kaspiSku (most reliable)
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
                    } else {
                        // Product not matched — include in order but flag it
                        console.warn(`Kaspi order ${kOrder.code}: product SKU "${sku}" not found locally. Add kaspiSku to the product.`);
                        name = entry.productName || `Kaspi: ${sku}`;
                    }
                }

                orderItemsPayload.push({
                    productId,
                    name,
                    quantity: entryQty,
                    price: entryPrice,
                    sku,
                    size
                });
            }

            // Skip ONLY garbage test orders where ALL items have no real code
            if (hasAnyUnknown && orderItemsPayload.every(i => i.sku === "UNKNOWN")) {
                console.log(`Skipping dummy order ${kOrder.code} (all items UNKNOWN)`);
                continue;
            }

            // Create Order, add History note, and Deduct Stock
            await prisma.$transaction(async (tx) => {
                const createdOrder = await tx.order.create({
                    data: {
                        orderNumber: kOrder.code,
                        clientName: kOrder.customer ? `${kOrder.customer.firstName} ${kOrder.customer.lastName}` : "Kaspi Client",
                        clientPhone: kOrder.customer?.cellPhone || "",
                        city: kOrder.deliveryAddress?.city || "Almaty",
                        address: kOrder.deliveryAddress?.formattedAddress || "",
                        comment: "Заказ из Kaspi — списано автоматически",
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

                // Log in Order History
                const unmatchedItems = orderItemsPayload.filter(i => !i.productId).map(i => i.name);
                await tx.orderHistory.create({
                    data: {
                        orderId: createdOrder.id,
                        action: "CREATED",
                        details: unmatchedItems.length > 0
                            ? `Заказ из Kaspi. Не найдены в инвентори: ${unmatchedItems.join(", ")}. Добавьте kaspiSku к товарам.`
                            : "Заказ из Kaspi — все товары успешно сопоставлены"
                    }
                });

                // Deduct stock for matched products only
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

export async function syncHalykOrders() {
    try {
        const halykOrders = await getHalykOrders(14); // Fetch last 14 days
        let addedCount = 0;

        for (const hOrder of halykOrders) {
            // Map Status
            let status = "PENDING";
            // Halyk status mapping
            if (hOrder.status === "APPROVED_BY_BANK") status = "PENDING";
            if (hOrder.status === "WAITING_COURIER") status = "READY_FOR_PICKUP";
            if (hOrder.status === "DELIVERY_IN_PROGRESS") status = "SHIPPED";
            if (hOrder.status === "DELIVERED" || hOrder.status === "DONE") status = "COMPLETED"; // Or ARCHIVED
            if (hOrder.status === "CANCELED" || hOrder.status === "CANCELLED" || hOrder.status === "RETURNED") status = "CANCELLED";

            // Support checking if order exists
            const existing = await prisma.order.findUnique({
                where: { orderNumber: hOrder.code }
            });

            if (existing) {
                const localIsFinished = ["COMPLETED", "ARCHIVED", "CANCELLED", "RETURNED"].includes(existing.status);
                const halykIsPending = status === "PENDING" || status === "READY_FOR_PICKUP";

                if (localIsFinished && halykIsPending) continue;

                if (existing.status !== status) {
                    await prisma.$transaction(async (tx) => {
                        await tx.order.update({
                            where: { id: existing.id },
                            data: { status }
                        });

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
                            await tx.orderHistory.create({
                                data: {
                                    orderId: existing.id,
                                    action: "STATUS_CHANGE",
                                    details: `Заказ Халык отменён, остатки возвращены на склад`
                                }
                            });
                        }
                    });
                }
                continue;
            }

            const finishedStatuses = ["COMPLETED", "RETURNED", "CANCELLED", "ARCHIVED", "DELIVERED"];
            if (finishedStatuses.includes(status) || finishedStatuses.includes(hOrder.status)) {
                continue; // Skip heavily history ones if not tracked yet
            }

            let deliveryMethod = hOrder.deliveryMode === "PHYSICAL_PICKUP" ? "PICKUP" : "HALYK";

            const orderItemsPayload: any[] = [];
            let hasAnyUnknown = true;

            for (const entry of hOrder.entries) {
                const sku = entry.skuCode || "UNKNOWN";
                let productId = null;
                let name = entry.skuName || "Товар Halyk";
                let size = null;

                if (sku && sku !== "UNKNOWN") {
                    hasAnyUnknown = false;
                    const localProduct = await prisma.product.findFirst({
                        where: { OR: [{ kaspiSku: sku }, { sku: sku }] }
                    });
                    if (localProduct) {
                        name = localProduct.name;
                        size = localProduct.size;
                        productId = localProduct.id;
                    } else {
                        console.warn(`Halyk order ${hOrder.code}: product SKU "${sku}" not found locally.`);
                    }
                }

                orderItemsPayload.push({
                    productId,
                    name,
                    quantity: entry.skuQuantity,
                    price: entry.skuPrice,
                    sku,
                    size
                });
            }

            if (hasAnyUnknown && orderItemsPayload.every(i => i.sku === "UNKNOWN")) {
                console.log(`Skipping dummy order ${hOrder.code}`);
                continue;
            }

            await prisma.$transaction(async (tx) => {
                const createdOrder = await tx.order.create({
                    data: {
                        orderNumber: hOrder.code,
                        clientName: hOrder.customer ? `${hOrder.customer.firstName} ${hOrder.customer.lastName}` : "Halyk Client",
                        clientPhone: hOrder.customer?.cellPhone || "",
                        city: hOrder.deliveryAddress?.city || "Almaty",
                        address: hOrder.deliveryAddress?.formattedAddress || "",
                        comment: "Заказ из Halyk — списано автоматически",
                        deliveryMethod: deliveryMethod,
                        paymentMethod: hOrder.paymentMode,
                        totalAmount: hOrder.totalPrice,
                        status: status,
                        createdAt: new Date(hOrder.creationDate),
                        source: "HALYK",
                        items: { create: orderItemsPayload }
                    }
                });

                const unmatchedItems = orderItemsPayload.filter(i => !i.productId).map(i => i.name);
                await tx.orderHistory.create({
                    data: {
                        orderId: createdOrder.id,
                        action: "CREATED",
                        details: unmatchedItems.length > 0
                            ? `Не найдены в инвентори: ${unmatchedItems.join(", ")}. Добавьте kaspiSku к товарам.`
                            : "Заказ из Halyk — все товары сопоставлены"
                    }
                });

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
        revalidatePath("/halyk");
        revalidatePath("/archive");
        return { success: true, added: addedCount, total: halykOrders.length };
    } catch (e: any) {
        console.error("Halyk Sync Error:", e);
        return { error: e.message || "Ошибка синхронизации" };
    }
}

// =========================
// SITE CONTENT (CMS) ACTIONS
// =========================

export async function getSiteContent() {
    try {
        let content = await prisma.siteContent.findFirst();
        if (!content) {
            content = await prisma.siteContent.create({
                data: {
                    text_ru: "Curated\nCollection.",
                    text_kz: "Таңдаулы\nКоллекция.",
                }
            });
        }
        return content;
    } catch (error) {
        console.error("Error getting site content:", error);
        throw new Error("Failed to get site content");
    }
}

export async function updateSiteContent(data: any) {
    try {
        const existing = await prisma.siteContent.findFirst();
        if (existing) {
            await prisma.siteContent.update({
                where: { id: existing.id },
                data: {
                    text_ru: data.text_ru,
                    text_kz: data.text_kz,
                    video_url: data.video_url,
                    video2_url: data.video2_url,
                    video3_url: data.video3_url,
                    returns_ru: data.returns_ru,
                    returns_kz: data.returns_kz,
                    contacts_ru: data.contacts_ru,
                    contacts_kz: data.contacts_kz,
                }
            });
        } else {
            await prisma.siteContent.create({
                data: {
                    text_ru: data.text_ru,
                    text_kz: data.text_kz,
                    video_url: data.video_url,
                    video2_url: data.video2_url,
                    video3_url: data.video3_url,
                    returns_ru: data.returns_ru,
                    returns_kz: data.returns_kz,
                    contacts_ru: data.contacts_ru,
                    contacts_kz: data.contacts_kz,
                }
            });
        }
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error updating site content:", error);
        throw new Error("Failed to update site content");
    }
}

// =========================
// STOREFRONT PRODUCT GROUPING
// =========================

export async function createStorefrontProduct(data: { name: string; image: string | undefined; productIds: number[] }) {
    try {
        const sfProduct = await prisma.storefrontProduct.create({
            data: {
                name: data.name,
                image: data.image
            }
        });

        if (data.productIds && data.productIds.length > 0) {
            await prisma.product.updateMany({
                where: { id: { in: data.productIds } },
                data: { storefrontProductId: sfProduct.id }
            });
        }
        revalidatePath('/inventory');
        revalidatePath('/storefront');
        return { success: true };
    } catch (error) {
        console.error("Storefront product creation error:", error);
        throw new Error("Не удалось создать витринную карточку");
    }
}

export async function addProductsToStorefront(storefrontId: number, productIds: number[]) {
    try {
        if (!productIds || productIds.length === 0) return { success: false, error: "Нет товаров" };
        
        await prisma.product.updateMany({
            where: { id: { in: productIds } },
            data: { storefrontProductId: storefrontId }
        });
        
        revalidatePath('/inventory');
        revalidatePath('/storefront');
        return { success: true };
    } catch (error) {
        console.error("Storefront addition error:", error);
        return { success: false, error: "Не удалось добавить товары в карточку" };
    }
}

export async function getStorefrontProducts() {
    try {
        return await prisma.storefrontProduct.findMany({
            include: {
                products: true
            },
            orderBy: {
                id: 'desc'
            }
        });
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function updateStorefrontProduct(id: number, data: { name?: string; image?: string | null; description?: string | null; video?: string | null; images?: string[] }) {
    try {
        await prisma.storefrontProduct.update({
            where: { id },
            data
        });
        revalidatePath('/storefront');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error("Error updating storefront product:", error);
        return { success: false, error: "Не удалось обновить карточку" };
    }
}

export async function deleteStorefrontProduct(id: number) {
    try {
        await prisma.product.updateMany({
            where: { storefrontProductId: id },
            data: { storefrontProductId: null }
        });
        await prisma.storefrontProduct.delete({
            where: { id }
        });
        revalidatePath('/storefront');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error(error);
        throw new Error("Не удалось удалить витринную карточку");
    }
}

export async function linkProductsToStorefront(storefrontId: number, productIds: number[]) {
    try {
        await prisma.product.updateMany({
            where: { id: { in: productIds } },
            data: { storefrontProductId: storefrontId }
        });
        revalidatePath('/storefront');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        throw new Error("Ошибка привязки");
    }
}

export async function applyStorefrontDiscounts(ids: number[], discountPrice: number | null) {
    try {
        const sfProducts = await prisma.storefrontProduct.findMany({
            where: { id: { in: ids } },
            include: { products: true }
        });

        for (const sf of sfProducts) {
            await prisma.storefrontProduct.update({ 
                where: { id: sf.id }, 
                data: { discountPrice } 
            });
            
            // Sync the prices down to the individual Products for Kaspi, Halyk and Warehouse logic
            for (const p of sf.products) {
                if (discountPrice !== null) {
                    // Applying discount
                    const newOldPrice = p.oldPrice || p.price; // Retain exactly the original price
                    await prisma.product.update({
                        where: { id: p.id },
                        data: {
                            oldPrice: newOldPrice,
                            price: discountPrice
                        }
                    });
                } else {
                    // Removing discount
                    if (p.oldPrice !== null) {
                        await prisma.product.update({
                            where: { id: p.id },
                            data: {
                                price: p.oldPrice,
                                oldPrice: null
                            }
                        });
                    }
                }
            }
        }

        revalidatePath('/storefront');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error("Discount apply error:", error);
        return { success: false, error: "Ошибка применения скидки" };
    }
}

// =========================
// WAREHOUSE TRANSFERS
// =========================

export async function transferProducts(items: { id: number, qty: number }[], direction: "TO_SHOWROOM" | "TO_WAREHOUSE") {
    try {
        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                if (item.qty <= 0) continue;
                
                const p = await tx.product.findUnique({ where: { id: item.id } });
                if (!p) throw new Error(`Товар ID ${item.id} не найден`);

                if (direction === "TO_SHOWROOM") {
                    if (p.quantity < item.qty) throw new Error(`Недостаточно на Складе для ${p.name}`);
                    await tx.product.update({
                        where: { id: p.id },
                        data: {
                            quantity: { decrement: item.qty },
                            quantityShowroom: { increment: item.qty }
                        }
                    });
                } else if (direction === "TO_WAREHOUSE") {
                    if (p.quantityShowroom < item.qty) throw new Error(`Недостаточно в Шоуруме для ${p.name}`);
                    await tx.product.update({
                        where: { id: p.id },
                        data: {
                            quantityShowroom: { decrement: item.qty },
                            quantity: { increment: item.qty }
                        }
                    });
                }
            }
        });
        revalidatePath('/inventory');
        revalidatePath('/showroom');
        return { success: true };
    } catch (e: any) {
        console.error("Transfer error:", e);
        return { success: false, error: e.message || "Ошибка перемещения" };
    }
}

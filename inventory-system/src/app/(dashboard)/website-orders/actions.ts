"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function confirmWebsiteOrder(orderId: number) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return { success: false, error: "Заказ не найден" };
        }

        // Change status from PENDING_CONFIRMATION to PENDING so it appears in Daily Plan
        await prisma.order.update({
            where: { id: orderId },
            data: { status: "PENDING" }
        });

        revalidatePath("/website-orders");
        revalidatePath("/daily-plan");

        return { success: true };
    } catch (error) {
        console.error("Failed to confirm order:", error);
        return { success: false, error: "Ошибка при подтверждении заказа" };
    }
}

export async function cancelWebsiteOrder(orderId: number) {
    try {
        await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { items: true }
            });

            if (!order) {
                throw new Error("Заказ не найден");
            }

            if (order.status === "CANCELLED") {
                throw new Error("Заказ уже отменен");
            }

            // Return stock
            for (const item of order.items) {
                if (item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { quantity: { increment: item.quantity } }
                    });
                    
                    await tx.transaction.create({
                        data: {
                            type: 'IN',
                            quantity: item.quantity,
                            productId: item.productId
                        }
                    });
                }
            }

            // Cancel order
            await tx.order.update({
                where: { id: orderId },
                data: { status: "CANCELLED" }
            });

            // Log history
            await tx.orderHistory.create({
                data: {
                    orderId,
                    action: "CANCELLED",
                    details: "Отменен в админ-панели (Заказы сайта), остатки возвращены"
                }
            });
        });

        revalidatePath("/website-orders");
        revalidatePath("/daily-plan");

        return { success: true };
    } catch (error: any) {
        console.error("Failed to cancel order:", error);
        return { success: false, error: error.message || "Ошибка при отмене заказа" };
    }
}

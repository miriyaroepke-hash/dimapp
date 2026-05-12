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

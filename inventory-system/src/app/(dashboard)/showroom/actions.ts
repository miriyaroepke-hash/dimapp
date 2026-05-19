"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleTransferStatus(itemId: number, isTransferred: boolean) {
    try {
        await prisma.orderItem.update({
            where: { id: itemId },
            data: { isTransferred }
        });
        revalidatePath("/showroom");
        return { success: true };
    } catch (e: any) {
        console.error("Error toggling transfer status", e);
        return { error: "Ошибка при обновлении статуса" };
    }
}

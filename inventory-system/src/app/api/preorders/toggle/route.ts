import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { itemId, supplierOrdered } = body;

        if (!itemId) {
            return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
        }

        await prisma.orderItem.update({
            where: { id: itemId },
            data: { supplierOrdered }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Toggle preorder item error:", e);
        return NextResponse.json({ error: e.message || "Error" }, { status: 500 });
    }
}

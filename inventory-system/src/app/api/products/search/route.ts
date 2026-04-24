import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q") || "";

    if (q.length < 2) {
        return NextResponse.json([]);
    }

    const products = await prisma.product.findMany({
        where: {
            quantity: { gt: 0 },
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { sku: { contains: q } }
            ]
        },
        select: {
            id: true,
            name: true,
            sku: true,
            size: true,
            price: true,
            quantity: true,
            image: true,
        },
        take: 20,
        orderBy: { name: "asc" }
    });

    return NextResponse.json(products);
}

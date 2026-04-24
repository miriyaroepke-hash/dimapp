import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    const count = await prisma.product.count({ where: { kaspiSku: { not: null } } });
    const products = await prisma.product.findMany({ where: { kaspiSku: { not: null } } });
    return NextResponse.json({ count, products: products.map(p => p.kaspiSku) });
}

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const products = await prisma.product.findMany({
        where: { quantity: { gt: 0 } }
    });

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<kaspi_catalog date="${new Date().toISOString()}" xmlns="kaspiShopping" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="kaspiShopping http://kaspi.kz/kaspishopping.xsd">
  <company>Inventory Store</company>
  <merchantid>YOUR_MERCHANT_ID</merchantid>
  <offers>
    ${products.map(p => `
    <offer sku="${p.kaspiSku || p.sku}">
      <model>${p.name}</model>
      <brand>Generic</brand>
      <availabilities>
        <availability available="${p.quantity > 0 ? 'yes' : 'no'}" storeId="PP1" preOrder="0"/>
      </availabilities>
      <price>${p.price}</price>
    </offer>
    `).join('')}
  </offers>
</kaspi_catalog>`;

    return new NextResponse(xml, {
        headers: {
            "Content-Type": "text/xml",
        },
    });
}

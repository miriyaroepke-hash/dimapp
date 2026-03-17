import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function GET() {
  // Получаем только те товары, у которых заполнен Kaspi SKU
  const products = await prisma.product.findMany({
    where: {
      AND: [
        { kaspiSku: { not: null } },
        { kaspiSku: { not: "" } }
      ]
    }
  });

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<kaspi_catalog date="${new Date().toISOString()}" xmlns="kaspiShopping" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="kaspiShopping http://kaspi.kz/kaspishopping.xsd">
  <company>Dimmiani</company>
  <merchantid>YOUR_MERCHANT_ID</merchantid>
  <offers>
    ${products.map((p) => {
    // Каспи артикул или внутренний штрихкод, если он есть
    const finalSku = p.kaspiSku && p.kaspiSku.trim() !== "" ? p.kaspiSku : p.sku;
    const preOrderDays = (p as any).preOrderDays ?? 0;
    const isAvailable = p.quantity > 0 || preOrderDays > 0 ? "yes" : "no";
    const stockCount = preOrderDays > 0 ? 0 : p.quantity; // when pre-order, stockCount=0

    return `
    <offer sku="${finalSku}">
      <model>${escapeXml(p.name)}</model>
      <brand>Dimmiani</brand>
      <availabilities>
        <availability available="${isAvailable}" storeId="PP1" preOrder="${preOrderDays}" stockCount="${stockCount}"/>
      </availabilities>
      <price>${p.price}</price>
    </offer>`;

  }).join('')}
  </offers>
</kaspi_catalog>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

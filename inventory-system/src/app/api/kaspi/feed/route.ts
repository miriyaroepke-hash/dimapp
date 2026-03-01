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
  // Получаем ВСЕ товары, даже с нулевым остатком.
  const products = await prisma.product.findMany();

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<kaspi_catalog date="${new Date().toISOString()}" xmlns="kaspiShopping" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="kaspiShopping http://kaspi.kz/kaspishopping.xsd">
  <company>Dimmiani</company>
  <merchantid>YOUR_MERCHANT_ID</merchantid>
  <offers>
    ${products.map((p) => {
    // Каспи артикул или внутренний штрихкод, если он есть
    const finalSku = p.kaspiSku && p.kaspiSku.trim() !== "" ? p.kaspiSku : p.sku;
    const isAvailable = p.quantity > 0 ? "yes" : "no";

    return `
    <offer sku="${finalSku}">
      <model>${escapeXml(p.name)}</model>
      <brand>Dimmiani</brand>
      <availabilities>
        <availability available="${isAvailable}" storeId="PP1" preOrder="0"/>
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

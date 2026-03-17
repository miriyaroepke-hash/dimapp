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
  <merchantid>Dimmiani</merchantid>
  <offers>
    ${(() => {
      // Группируем товары по kaspiSku для агрегации остатков
      const groups: Record<string, {
        name: string,
        price: number,
        totalQty: number,
        maxPreOrderDays: number
      }> = {};

      products.forEach(p => {
        const sku = p.kaspiSku!.trim();
        if (!groups[sku]) {
          groups[sku] = {
            name: p.name,
            price: p.price,
            totalQty: 0,
            maxPreOrderDays: 0
          };
        }
        // Суммируем только положительные остатки (или 0)
        groups[sku].totalQty += Math.max(0, p.quantity);
        // Берем максимальный срок предзаказа
        groups[sku].maxPreOrderDays = Math.max(groups[sku].maxPreOrderDays, (p as any).preOrderDays || 0);
        // Можно также обновлять цену, если она отличается, или имя
        groups[sku].price = p.price; 
      });

      return Object.entries(groups).map(([sku, data]) => {
        const isAvailable = data.totalQty > 0 || data.maxPreOrderDays > 0 ? "yes" : "no";
        const stockCount = data.maxPreOrderDays > 0 ? 0 : data.totalQty;

        return `
    <offer sku="${sku}">
      <model>${escapeXml(data.name)}</model>
      <brand>Dimmiani</brand>
      <availabilities>
        <availability available="${isAvailable}" storeId="PP1" preOrder="${data.maxPreOrderDays}" stockCount="${stockCount}"/>
      </availabilities>
      <price>${data.price}</price>
    </offer>`;
      }).join('');
    })()}
  </offers>
</kaspi_catalog>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

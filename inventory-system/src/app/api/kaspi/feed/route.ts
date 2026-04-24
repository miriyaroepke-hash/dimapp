import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
        if (p.quantity < 0) return;
        if (!groups[sku]) {
          groups[sku] = {
            name: p.name,
            price: p.price,
            totalQty: 0,
            maxPreOrderDays: 0
          };
        }
        // Суммируем только положительные остатки (или 0)
        const qty = Math.max(0, p.quantity);
        groups[sku].totalQty += qty;
        
        // Предзаказ учитываем ТОЛЬКО если количество товара фактически > 0.
        // Если количество <= 0, предзаказ игнорируется (обнуляется для Каспи).
        if (qty > 0) {
            groups[sku].maxPreOrderDays = Math.max(groups[sku].maxPreOrderDays, (p as any).preOrderDays || 0);
        }
        
        // Можно также обновлять цену, если она отличается, или имя
        groups[sku].price = p.price; 
      });

      return Object.entries(groups).map(([sku, data]) => {
        const isAvailable = data.totalQty > 0 || data.maxPreOrderDays > 0 ? "yes" : "no";
        
        let availabilityTag = `<availability available="${isAvailable}" storeId="PP3"`;
        if (data.maxPreOrderDays > 0) {
            availabilityTag += ` preOrder="${data.maxPreOrderDays}"`;
        } else {
            availabilityTag += ` stockCount="${data.totalQty}"`;
        }
        availabilityTag += `/>`;

        return `
    <offer sku="${sku}">
      <model>${escapeXml(data.name)}</model>
      <brand>Dimmiani</brand>
      <availabilities>
        ${availabilityTag}
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

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

function formatKaspiDate(d: Date) {
  // Format as YYYY-MM-DD HH:mm in Almaty time (UTC+5)
  const almaty = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  const yyyy = almaty.getUTCFullYear();
  const mm = String(almaty.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(almaty.getUTCDate()).padStart(2, '0');
  const hh = String(almaty.getUTCHours()).padStart(2, '0');
  const min = String(almaty.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
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

  const merchantId = process.env.KASPI_MERCHANT_ID || "8967019";

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<kaspi_catalog date="${formatKaspiDate(new Date())}" xmlns="kaspiShopping" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://kaspi.kz/kaspishopping.xsd">
  <company>${merchantId}</company>
  <merchantid>${merchantId}</merchantid>
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
        const fullName = p.size && !p.name.trim().endsWith(p.size.trim())
          ? `${p.name.trim()} ${p.size.trim()}`
          : p.name.trim();

        if (!groups[sku]) {
          groups[sku] = {
            name: fullName,
            price: p.price,
            totalQty: 0,
            maxPreOrderDays: 0
          };
        }
        const qty = Math.max(0, p.quantity);
        groups[sku].totalQty += qty;
        
        if (qty > 0 || (p as any).isPreorder) {
          groups[sku].maxPreOrderDays = Math.max(groups[sku].maxPreOrderDays, (p as any).preOrderDays || 0);
        }
        
        groups[sku].price = p.price; 
      });

      return Object.entries(groups).map(([sku, data]) => {
        const isAvailable = data.totalQty > 0 || data.maxPreOrderDays > 0 ? "yes" : "no";
        const stockCount = data.maxPreOrderDays > 0 ? 0 : data.totalQty;
        const availabilityTag = `<availability available="${isAvailable}" storeId="PP3" preOrder="${data.maxPreOrderDays}" stockCount="${stockCount}"/>`;

        return `
    <offer sku="${escapeXml(sku)}">
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
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

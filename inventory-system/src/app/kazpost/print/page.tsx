import prisma from "@/lib/prisma";
import "./print.css"; // We'll create a small print.css

// Next.js 15 requires awaiting searchParams if it's treated as a Promise.
// But in 14 it's an object. To be safe, we extract it.
export default async function KazpostPrintPage({
    searchParams,
}: {
    searchParams: { ids?: string | string[] } | Promise<{ ids?: string | string[] }>;
}) {
    // Resolve searchParams if it's a promise (Next 15+ async searchParams)
    const resolvedParams = await Promise.resolve(searchParams);

    // Extract 'ids'
    let idsParam = resolvedParams?.ids;
    if (Array.isArray(idsParam)) {
        idsParam = idsParam[0];
    }

    if (!idsParam) {
        return <div className="p-10 text-center text-red-500">Нет выбранных заказов для печати</div>;
    }

    const orderIds = idsParam.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (orderIds.length === 0) {
        return <div className="p-10 text-center text-red-500">Неверный формат ID заказов</div>;
    }

    const orders = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        orderBy: { id: "asc" }
    });

    if (orders.length === 0) {
        return <div className="p-10 text-center text-red-500">Заказы не найдены</div>;
    }

    return (
        <div className="print-container">
            {/* Auto-print script */}
            <script dangerouslySetInnerHTML={{ __html: "window.onload = function() { window.print(); }" }} />

            {orders.map((order) => {
                // Determine Address text
                let addressText = order.address || "";
                if (!addressText && order.street) {
                    addressText = `ул. ${order.street}, д. ${order.house || ""}`;
                    if (order.apartment) addressText += `, кв/оф ${order.apartment}`;
                    if (order.city) addressText = `${order.city}, ${addressText}`;
                } else if (!addressText && order.city) {
                    addressText = order.city;
                }

                return (
                    <div key={order.id} className="waybill-page">
                        <table className="waybill-table">
                            <tbody>
                                <tr>
                                    <td className="sender-col">
                                        <div className="line"><b>От:</b> Рёпке Марии</div>
                                        <div className="line"><b>Телефон:</b> 8(747)767-71-24</div>
                                        <div className="line"><b>Адрес:</b> г.Алматы, ул. Тулебаева 38</div>
                                        <div className="line"><b>Индекс</b> 050002</div>
                                        <div className="line"><b>Ценность:</b> 10 000 тенге</div>
                                        <div className="line uppercase font-bold mt-2">БЕЗ НАЛОЖЕННОГО ПЛАТЕЖА</div>
                                    </td>
                                    <td className="receiver-col">
                                        <div className="line"><b>Кому:</b> {order.clientName || ""}</div>
                                        <div className="line"><b>Телефон:</b> {order.clientPhone || ""}</div>
                                        <div className="line pt-4"><b>Адрес:</b> {addressText}</div>
                                        <div className="line uppercase font-bold mt-2">ИНДЕКС: {order.postalCode || ""}</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                );
            })}
        </div>
    );
}

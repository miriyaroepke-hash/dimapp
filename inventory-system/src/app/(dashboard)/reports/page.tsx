import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
        redirect("/");
    }

    // 1. Sales by month
    const orders = await prisma.order.findMany({
        where: { status: { notIn: ["CANCELLED", "RETURNED"] } },
        select: { createdAt: true, totalAmount: true }
    });

    const monthlySalesMap: Record<string, { month: string, revenue: number, orderCount: number }> = {};
    orders.forEach(o => {
        const d = new Date(o.createdAt);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlySalesMap[month]) monthlySalesMap[month] = { month, revenue: 0, orderCount: 0 };
        monthlySalesMap[month].revenue += o.totalAmount;
        monthlySalesMap[month].orderCount += 1;
    });
    const monthlySales = Object.values(monthlySalesMap).sort((a, b) => a.month.localeCompare(b.month));

    // 2. Best selling products (Top 20)
    const orderItems = await prisma.orderItem.findMany({
        where: { order: { status: { notIn: ["CANCELLED", "RETURNED"] } } },
        select: { name: true, sku: true, quantity: true }
    });

    const productSalesMap: Record<string, { name: string, quantity: number }> = {};
    orderItems.forEach(item => {
        const key = item.sku || item.name;
        if (!productSalesMap[key]) productSalesMap[key] = { name: item.name, quantity: 0 };
        productSalesMap[key].quantity += item.quantity;
    });
    const topProducts = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity).slice(0, 20);

    // 3. Products added by month (Výrabotka) - via Transactions
    const inboundTransactions = await prisma.transaction.findMany({
        where: {
            OR: [
                { type: 'IN' },
                { type: 'ADJUSTMENT', quantity: { gt: 0 } }
            ]
        },
        include: { product: true }
    });

    const monthlyProductsMap: Record<string, { month: string, unitsAdded: number, totalValue: number }> = {};
    inboundTransactions.forEach(tx => {
        const d = new Date(tx.date);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyProductsMap[month]) monthlyProductsMap[month] = { month, unitsAdded: 0, totalValue: 0 };
        monthlyProductsMap[month].unitsAdded += tx.quantity;
        monthlyProductsMap[month].totalValue += (tx.product.price * tx.quantity);
    });
    const monthlyProducts = Object.values(monthlyProductsMap).sort((a, b) => a.month.localeCompare(b.month));

    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-3xl font-bold">Аналитика и Отчеты</h1>
            <p className="text-gray-500">Графики и таблицы для анализа продаж и склада.</p>
            
            <ReportsClient 
                monthlySales={monthlySales} 
                topProducts={topProducts} 
                monthlyProducts={monthlyProducts} 
            />
        </div>
    );
}

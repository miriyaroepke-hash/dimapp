"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface MonthlySalesData {
    month: string;
    revenue: number;
    orderCount: number;
}

interface TopProductData {
    name: string;
    quantity: number;
}

interface MonthlyProductData {
    month: string;
    unitsAdded: number;
    totalValue: number;
}

interface ReportsClientProps {
    monthlySales: MonthlySalesData[];
    topProducts: TopProductData[];
    monthlyProducts: MonthlyProductData[];
}

export default function ReportsClient({ monthlySales, topProducts, monthlyProducts }: ReportsClientProps) {
    return (
        <div className="space-y-8">
            {/* Sales Section */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Продажи по месяцам</h2>
                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlySales}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip formatter={(value: any, name: any) => [
                                name === "Выручка (₸)" ? `₸${Number(value).toLocaleString()}` : value,
                                name
                            ]} />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#8884d8" name="Выручка (₸)" />
                            <Line yAxisId="right" type="monotone" dataKey="orderCount" stroke="#82ca9d" name="Кол-во заказов" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">Топ-20 хитов продаж</h2>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                                <Tooltip formatter={(value: any) => [value, "Продано (шт)"]} />
                                <Bar dataKey="quantity" fill="#ffc658" name="Продано (шт)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Added Products (Výrabotka) */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">Добавлено товаров по месяцам</h2>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyProducts}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip formatter={(value: any, name: any) => [
                                    name === "totalValue" ? `₸${Number(value).toLocaleString()}` : value,
                                    name === "totalValue" ? "Сумма стоимости (₸)" : "Добавлено единиц (шт)"
                                ]} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="unitsAdded" fill="#8884d8" name="Добавлено позиций" />
                                <Bar yAxisId="right" dataKey="totalValue" fill="#82ca9d" name="Сумма стоимости" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

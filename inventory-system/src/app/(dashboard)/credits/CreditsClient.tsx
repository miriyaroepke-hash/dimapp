"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, ToggleLeft, ToggleRight, TrendingDown, Wallet, Calculator } from "lucide-react";
import { format } from "date-fns";

interface Credit {
    id: number;
    name: string;
    principal: number;
    dailyPayment: number;
    monthlyPayment: number;
    startDate: string | Date;
    durationMonths: number;
    isActive: boolean;
    createdAt: string | Date;
}

interface Props {
    credits: Credit[];
    balance: number;
}

const empty = {
    name: "",
    principal: "",
    dailyPayment: "",
    monthlyPayment: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    durationMonths: "12",
};

export default function CreditsClient({ credits: initial, balance: initialBalance }: Props) {
    const router = useRouter();
    const [credits, setCredits] = useState<Credit[]>(initial);
    const [balance, setBalance] = useState(initialBalance);
    const [form, setForm] = useState(empty);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [balanceInput, setBalanceInput] = useState("");
    const [editingBalance, setEditingBalance] = useState(false);

    const activeCredits = credits.filter((c) => c.isActive);
    const totalDailyDebt = activeCredits.reduce((sum, c) => sum + c.dailyPayment, 0);
    const totalMonthlyDebt = activeCredits.reduce((sum, c) => sum + c.monthlyPayment, 0);

    const overpay = (credit: Credit) =>
        credit.dailyPayment * 365 - credit.principal;

    const addCredit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/credits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (res.ok) {
                setCredits((prev) => [data, ...prev]);
                setForm(empty);
                setShowForm(false);
            } else {
                alert(data.error);
            }
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (credit: Credit) => {
        const res = await fetch(`/api/credits/${credit.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !credit.isActive }),
        });
        if (res.ok) {
            setCredits((prev) =>
                prev.map((c) => (c.id === credit.id ? { ...c, isActive: !c.isActive } : c))
            );
        }
    };

    const deleteCredit = async (id: number) => {
        if (!confirm("Удалить этот кредит?")) return;
        const res = await fetch(`/api/credits/${id}`, { method: "DELETE" });
        if (res.ok) {
            setCredits((prev) => prev.filter((c) => c.id !== id));
        }
    };

    const saveBalance = async () => {
        const amount = parseFloat(balanceInput);
        if (isNaN(amount)) return;
        const res = await fetch("/api/balance", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
        });
        if (res.ok) {
            setBalance(amount);
            setEditingBalance(false);
            setBalanceInput("");
        }
    };

    const fmt = (n: number) =>
        "₸ " + n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold">Кредиты</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                    <PlusCircle className="w-5 h-5" />
                    Добавить кредит
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Balance */}
                <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                        <Wallet className="w-4 h-4" />
                        Доступный баланс
                    </div>
                    <div className={`text-3xl font-bold ${balance < 0 ? "text-red-600" : "text-green-700"}`}>
                        {fmt(balance)}
                    </div>
                    {editingBalance ? (
                        <div className="flex gap-2 mt-1">
                            <input
                                type="number"
                                className="border rounded px-2 py-1 text-sm w-full"
                                placeholder="Введите сумму"
                                value={balanceInput}
                                onChange={(e) => setBalanceInput(e.target.value)}
                                autoFocus
                            />
                            <button onClick={saveBalance} className="px-3 py-1 bg-green-600 text-white rounded text-sm">✓</button>
                            <button onClick={() => setEditingBalance(false)} className="px-3 py-1 border rounded text-sm">✕</button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setEditingBalance(true)}
                            className="text-sm text-blue-600 hover:underline text-left"
                        >
                            Изменить баланс
                        </button>
                    )}
                </div>

                {/* Daily Debt */}
                <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        Ежедневное списание
                    </div>
                    <div className="text-3xl font-bold text-red-600">{fmt(totalDailyDebt)}</div>
                    <div className="text-sm text-gray-400">по {activeCredits.length} активным кредитам</div>
                </div>

                {/* Monthly Debt */}
                <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                        <Calculator className="w-4 h-4 text-orange-500" />
                        Платеж в месяц
                    </div>
                    <div className="text-3xl font-bold text-orange-600">{fmt(totalMonthlyDebt)}</div>
                    <div className="text-sm text-gray-400">суммарно</div>
                </div>
            </div>

            {/* Add Credit Form */}
            {showForm && (
                <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
                    <h2 className="text-lg font-bold mb-4">Новый кредит</h2>
                    <form onSubmit={addCredit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium mb-1">Название</label>
                            <input
                                required
                                type="text"
                                placeholder='Например: "Кредит 1М"'
                                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Сумма займа (тело) ₸</label>
                            <input
                                required
                                type="number"
                                placeholder="1 000 000"
                                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={form.principal}
                                onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Ежедневный платеж ₸</label>
                            <input
                                required
                                type="number"
                                placeholder="3 500"
                                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={form.dailyPayment}
                                onChange={(e) => setForm((f) => ({ ...f, dailyPayment: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Общий платеж в месяц ₸</label>
                            <input
                                required
                                type="number"
                                placeholder="105 000"
                                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={form.monthlyPayment}
                                onChange={(e) => setForm((f) => ({ ...f, monthlyPayment: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Дата начала</label>
                            <input
                                required
                                type="date"
                                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={form.startDate}
                                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Срок (месяцев)</label>
                            <input
                                required
                                type="number"
                                placeholder="12"
                                min="1"
                                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={form.durationMonths}
                                onChange={(e) => setForm((f) => ({ ...f, durationMonths: e.target.value }))}
                            />
                        </div>

                        {/* Overpayment preview */}
                        {form.dailyPayment && form.principal && (
                            <div className="sm:col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                                <span className="font-medium text-amber-800">Переплата: </span>
                                <span className="text-amber-700 font-bold">
                                    {fmt(parseFloat(form.dailyPayment) * 365 - parseFloat(form.principal))}
                                </span>
                                <span className="text-amber-600 ml-2 text-xs">
                                    = (ежедн. {fmt(parseFloat(form.dailyPayment))} × 365) − {fmt(parseFloat(form.principal))}
                                </span>
                            </div>
                        )}

                        <div className="sm:col-span-2 flex gap-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
                            >
                                {saving ? "Сохранение..." : "Добавить"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                            >
                                Отмена
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Credits Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="px-5 py-3 text-left">Название</th>
                                <th className="px-5 py-3 text-right">Тело кредита</th>
                                <th className="px-5 py-3 text-right">Ежедн. платеж</th>
                                <th className="px-5 py-3 text-right">В месяц</th>
                                <th className="px-5 py-3 text-right">Переплата</th>
                                <th className="px-5 py-3 text-left">Начало / Срок</th>
                                <th className="px-5 py-3 text-center">Статус</th>
                                <th className="px-5 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {credits.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-5 py-10 text-center text-gray-400">
                                        Кредитов не найдено. Нажмите «Добавить кредит» выше.
                                    </td>
                                </tr>
                            )}
                            {credits.map((c) => (
                                <tr key={c.id} className={`hover:bg-gray-50 ${!c.isActive ? "opacity-50" : ""}`}>
                                    <td className="px-5 py-4 font-medium">{c.name}</td>
                                    <td className="px-5 py-4 text-right">{fmt(c.principal)}</td>
                                    <td className="px-5 py-4 text-right font-semibold text-red-700">{fmt(c.dailyPayment)}</td>
                                    <td className="px-5 py-4 text-right">{fmt(c.monthlyPayment)}</td>
                                    <td className="px-5 py-4 text-right text-amber-700">{fmt(overpay(c))}</td>
                                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                                        {format(new Date(c.startDate), "dd.MM.yyyy")} / {c.durationMonths} мес.
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <button onClick={() => toggleActive(c)} title={c.isActive ? "Деактивировать" : "Активировать"}>
                                            {c.isActive
                                                ? <ToggleRight className="w-6 h-6 text-green-600 mx-auto" />
                                                : <ToggleLeft className="w-6 h-6 text-gray-400 mx-auto" />
                                            }
                                        </button>
                                    </td>
                                    <td className="px-5 py-4">
                                        <button onClick={() => deleteCredit(c.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {credits.length > 0 && (
                            <tfoot className="bg-gray-50 text-sm font-bold">
                                <tr>
                                    <td className="px-5 py-3 text-gray-600">Итого (активные)</td>
                                    <td className="px-5 py-3 text-right text-gray-600">—</td>
                                    <td className="px-5 py-3 text-right text-red-700">{fmt(totalDailyDebt)}</td>
                                    <td className="px-5 py-3 text-right text-orange-700">{fmt(totalMonthlyDebt)}</td>
                                    <td colSpan={4} className="px-5 py-3"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}

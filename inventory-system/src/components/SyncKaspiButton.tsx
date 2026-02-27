"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { syncKaspiOrders } from "@/app/actions";
import { useRouter } from "next/navigation";

export default function SyncKaspiButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSync = async () => {
        setLoading(true);
        const res = await syncKaspiOrders();
        setLoading(false);
        if (res.error) {
            alert(res.error);
        } else {
            alert(`Синхронизация завершена. Новых заказов: ${res.added}`);
            router.refresh(); // Refresh inventory page immediately
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
        >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Синхронизировать Kaspi
        </button>
    );
}

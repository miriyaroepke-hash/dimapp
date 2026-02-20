"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";

export default function SettingsPage() {
    const [importing, setImporting] = useState(false);

    const handleImportMoiSklad = async () => {
        setImporting(true);
        // Simulate import
        await new Promise(resolve => setTimeout(resolve, 2000));
        alert("Импорт из МойСклад еще не реализован (требуются ключи API)");
        setImporting(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">Настройки</h1>

            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <h2 className="text-xl font-bold border-b pb-2">Интеграции</h2>

                <div className="flex items-center justify-between p-4 border rounded bg-gray-50">
                    <div>
                        <h3 className="font-bold">Kaspi.kz XML Feed</h3>
                        <p className="text-sm text-gray-500">XML фид для синхронизации товаров</p>
                    </div>
                    <div className="flex gap-2">
                        <a
                            href="/api/kaspi/feed"
                            target="_blank"
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Открыть Feed
                        </a>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded bg-gray-50">
                    <div>
                        <h3 className="font-bold">МойСклад</h3>
                        <p className="text-sm text-gray-500">Импорт товаров</p>
                    </div>
                    <button
                        onClick={handleImportMoiSklad}
                        disabled={importing}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        {importing ? "Импорт..." : "Импорт товаров"}
                    </button>
                </div>
            </div>
        </div>
    );
}

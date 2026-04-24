"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CreateOrderModal from "@/components/CreateOrderModal";

export default function CreateOrderClient() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-purple-700 font-medium"
            >
                <Plus className="w-5 h-5 mr-2" />
                Создать заказ
            </button>

            {isModalOpen && (
                <CreateOrderModal
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </>
    );
}

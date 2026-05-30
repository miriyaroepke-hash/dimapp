"use client";

import { Trash2 } from "lucide-react";
import { deleteBlogPost } from "@/app/actions";
import { useState } from "react";

export default function DeleteButton({ id }: { id: number }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("Вы уверены, что хотите удалить эту статью?")) return;
        setIsDeleting(true);
        try {
            await deleteBlogPost(id);
        } catch (e) {
            alert("Ошибка при удалении");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
        >
            <Trash2 className="w-5 h-5" />
        </button>
    );
}

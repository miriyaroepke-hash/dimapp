import ProductForm from "@/components/ProductForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AddProductPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center mb-6">
                <Link href="/inventory" className="mr-4 p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-2xl font-bold">Добавить новый товар</h1>
            </div>

            <ProductForm />
        </div>
    );
}

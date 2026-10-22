import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getStorefrontProducts, getCategoryContents } from "@/app/actions";
import StorefrontTable from "./StorefrontTable";
import { DEFAULT_CATEGORIES } from "../cms/CmsForm";

export const dynamic = "force-dynamic";

export default async function StorefrontPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        redirect("/inventory");
    }

    const [products, categoryContents] = await Promise.all([
        getStorefrontProducts(),
        getCategoryContents()
    ]);

    let categories = DEFAULT_CATEGORIES;
    const rawConfig = categoryContents?.['_categories_config_']?.text_ru;
    if (rawConfig) {
        try {
            const parsed = JSON.parse(rawConfig);
            if (Array.isArray(parsed) && parsed.length > 0) categories = parsed;
        } catch (e) {}
    }

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Витрина</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Объединенные карточки товаров для отображения на сайте магазина.
                    </p>
                </div>
            </div>

            <StorefrontTable products={products as any} initialCategories={categories} />
        </div>
    );
}

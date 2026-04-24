import { getSiteContent } from "@/app/actions";
import CmsForm from "./CmsForm";

export default async function CmsPage() {
    const content = await getSiteContent();

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold">Конструктор сайта</h1>
                <p className="text-gray-500 mt-2">
                    Здесь вы можете управлять текстовым и медиа-контентом на публичной витрине.
                </p>
            </div>
            
            <CmsForm initialData={content} />
        </div>
    );
}

"use client";

import { useState } from "react";
import { updateSiteContent, saveCategoryContent } from "@/app/actions";
import { Check, Loader2, ExternalLink, Image } from "lucide-react";

// Secret token to activate admin mode on storefront (stored in localStorage on vitrina)
const ADMIN_TOKEN = "dimmiani_admin_2024";

const CATEGORIES = [
    { id: 'new', label: 'Новинки' },
    { id: 'dresses', label: 'Платья' },
    { id: 'pants', label: 'Брюки' },
    { id: 'shirts', label: 'Рубашки' },
    { id: 'skirts', label: 'Юбки' },
    { id: 'suits', label: 'Костюмы' },
    { id: 'sale', label: 'Скидки (SALE)' },
];

export default function CmsForm({ initialData, initialCategories }: { initialData: any, initialCategories: any }) {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [form, setForm] = useState({
        text_ru: initialData?.text_ru || "",
        text_kz: initialData?.text_kz || "",
        photo1: initialData?.photo1 || "",
        photo2: initialData?.photo2 || "",
        video_url: initialData?.video_url || "",
        video2_url: initialData?.video2_url || "",
        video3_url: initialData?.video3_url || "",
        returns_ru: initialData?.returns_ru || "",
        returns_kz: initialData?.returns_kz || "",
        terms_ru: initialData?.terms_ru || "",
        terms_kz: initialData?.terms_kz || "",
        blog_ru: initialData?.blog_ru || "",
        blog_kz: initialData?.blog_kz || "",
        contacts_ru: initialData?.contacts_ru || "",
        contacts_kz: initialData?.contacts_kz || "",
    });
    const [categoryContents, setCategoryContents] = useState<Record<string, any>>(initialCategories || {});
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    const handleCategorySave = async (catId: string) => {
        setIsLoading(true);
        try {
            const cat = categoryContents[catId] || { id: catId };
            await saveCategoryContent(catId, cat.text_ru || "", cat.text_kz || "", cat.image);
            alert('Контент категории сохранен!');
        } catch (e) { alert('Ошибка.'); }
        finally { setIsLoading(false); }
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, isCat = false, catId = "") => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingField(fieldName);
        try {
            // Get signature from backend
            const signRes = await fetch("/api/cloudinary-sign", { method: "POST" });
            const signData = await signRes.json();
            
            if (!signRes.ok) throw new Error("Failed to get upload signature");

            // Upload directly to Cloudinary
            const isVideo = file.type.startsWith('video/');
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);
            uploadFormData.append("api_key", signData.apiKey);
            uploadFormData.append("timestamp", signData.timestamp);
            uploadFormData.append("signature", signData.signature);
            uploadFormData.append("folder", signData.folder);

            const uploadUrl = `https://api.cloudinary.com/v1_1/${signData.cloudName}/${isVideo ? 'video' : 'image'}/upload`;

            const res = await fetch(uploadUrl, {
                method: "POST",
                body: uploadFormData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || "Upload failed");

            if (isCat) {
                setCategoryContents(prev => ({ ...prev, [catId]: { ...prev[catId], image: data.secure_url } }));
            } else {
                setForm(prev => ({ ...prev, [fieldName]: data.secure_url }));
            }
        } catch (err: any) {
            alert("Ошибка при загрузке: " + err.message);
        } finally {
            setUploadingField(null);
            e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccess(false);
        try {
            await updateSiteContent(form);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error(error);
            alert("Ошибка сохранения");
        } finally {
            setIsLoading(false);
        }
    };

    const vitrinaAdminUrl = `https://dimmiani.kz/?adminToken=${ADMIN_TOKEN}`;

    // Helper: upload button
    const UploadBtn = ({ field, accept, label }: { field: string; accept: string; label: string }) => (
        <label className="relative flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded hover:bg-blue-100 transition cursor-pointer overflow-hidden border border-blue-200 whitespace-nowrap">
            {uploadingField === field ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Загрузка...</>
            ) : label}
            <input
                type="file"
                accept={accept}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                onChange={(e) => handleMediaUpload(e, field)}
                disabled={uploadingField !== null}
            />
        </label>
    );

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">

            {/* КНОПКА ОТКРЫТЬ ВИТРИНУ */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                    <p className="font-semibold text-indigo-800">Предпросмотр витрины (режим администратора)</p>
                    <p className="text-sm text-indigo-600 mt-0.5">Открывает витрину с доступом к корзине и функциям заказа</p>
                </div>
                <a
                    href={vitrinaAdminUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 transition"
                >
                    Открыть витрину <ExternalLink className="w-4 h-4" />
                </a>
            </div>

            {/* ТЕКСТЫ ГЛАВНОГО ЭКРАНА */}
            <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold border-b pb-2">Главный экран (Тексты)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Текст (Русский)</label>
                        <textarea
                            rows={3}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.text_ru}
                            onChange={(e) => setForm({ ...form, text_ru: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Текст (Қазақша)</label>
                        <textarea
                            rows={3}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.text_kz}
                            onChange={(e) => setForm({ ...form, text_kz: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* ФОТОГРАФИИ */}
            <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold border-b pb-2">Фотографии на главной</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {([
                        { field: 'photo1', label: 'Фото 1' },
                        { field: 'photo2', label: 'Фото 2' },
                    ] as const).map(({ field, label }) => (
                        <div key={field}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                            {form[field] && (
                                <img src={form[field]} alt="" className="w-full h-48 object-cover rounded mb-2" />
                            )}
                            {!form[field] && (
                                <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 mb-2">
                                    <Image className="w-8 h-8" />
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="или вставьте URL..."
                                    className="flex-1 border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                    value={form[field]}
                                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                                />
                                <UploadBtn field={field} accept="image/*" label="Загрузить" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ВИДЕО */}
            <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold border-b pb-2">Медиа (Видео на главной)</h2>
                <div className="space-y-4">
                    {([
                        { field: 'video_url', label: 'Видео 1 (Большое верхнее)' },
                        { field: 'video2_url', label: 'Видео 2 (Левое нижнее)' },
                        { field: 'video3_url', label: 'Видео 3 (Правое нижнее)' },
                    ] as const).map(({ field, label }) => (
                        <div key={field}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="https://.../video.mp4"
                                    className="flex-1 border p-2 rounded focus:ring-2 focus:ring-blue-500"
                                    value={form[field]}
                                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                                />
                                <UploadBtn field={field} accept="video/*" label="Загрузить видео" />
                            </div>
                            {form[field] && (
                                <video src={form[field]} className="mt-2 h-28 rounded object-cover" muted />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ВОЗВРАТЫ */}
            <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold border-b pb-2">Политика возврата</h2>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Возвраты (Русский)</label>
                        <textarea
                            rows={4}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.returns_ru}
                            onChange={(e) => setForm({ ...form, returns_ru: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Возвраты (Қазақша)</label>
                        <textarea
                            rows={4}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.returns_kz}
                            onChange={(e) => setForm({ ...form, returns_kz: e.target.value })}
                        />
                    </div>
                </div>
            </div>
            {/* УСЛОВИЯ ЗАКАЗА И ДОСТАВКИ */}
            <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold border-b pb-2">Условия заказа и доставки</h2>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Текст (Русский)</label>
                        <textarea
                            rows={4}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.terms_ru}
                            onChange={(e) => setForm({ ...form, terms_ru: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Текст (Қазақша)</label>
                        <textarea
                            rows={4}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.terms_kz}
                            onChange={(e) => setForm({ ...form, terms_kz: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* БЛОГ */}
            <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm border flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Блог</h2>
                    <p className="text-sm text-gray-500 mt-1">Теперь у блога есть свой расширенный редактор со статьями и картинками.</p>
                </div>
                <a href="/cms/blog" className="px-5 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition">
                    Перейти в Блог
                </a>
            </div>
            {/* КОНТАКТЫ */}
            <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold border-b pb-2">Контакты</h2>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Адреса и контакты (Русский)</label>
                        <textarea
                            rows={4}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.contacts_ru}
                            onChange={(e) => setForm({ ...form, contacts_ru: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Адреса и контакты (Қазақша)</label>
                        <textarea
                            rows={4}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.contacts_kz}
                            onChange={(e) => setForm({ ...form, contacts_kz: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* КОНТЕНТ КАТЕГОРИЙ */}
            <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold border-b pb-2">Категории каталога</h2>
                <p className="text-sm text-gray-500 mb-4">Настройте баннер и описание для каждой вкладки в каталоге.</p>
                <div className="space-y-8">
                    {CATEGORIES.map(cat => {
                        const content = categoryContents[cat.id] || {};
                        return (
                            <div key={cat.id} className="border p-4 rounded-lg bg-gray-50/50">
                                <h3 className="font-semibold text-lg mb-3">{cat.label}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Описание категории (RU)</label>
                                            <textarea
                                                rows={3}
                                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                                                value={content.text_ru || ''}
                                                onChange={e => setCategoryContents(prev => ({ ...prev, [cat.id]: { ...prev[cat.id], text_ru: e.target.value } }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Описание категории (KZ)</label>
                                            <textarea
                                                rows={3}
                                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                                                value={content.text_kz || ''}
                                                onChange={e => setCategoryContents(prev => ({ ...prev, [cat.id]: { ...prev[cat.id], text_kz: e.target.value } }))}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleCategorySave(cat.id)}
                                            className="px-4 py-1.5 bg-blue-100 text-blue-700 font-medium rounded hover:bg-blue-200 transition text-sm"
                                        >
                                            Сохранить тексты категории
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Баннер категории</label>
                                        {content.image ? (
                                            <img src={content.image} alt="" className="w-full h-32 object-cover rounded mb-2 shadow-sm" />
                                        ) : (
                                            <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center text-gray-500 mb-2">Нет баннера</div>
                                        )}
                                        <label className="relative flex items-center justify-center px-4 py-1.5 bg-white text-gray-700 font-medium rounded border hover:bg-gray-50 transition cursor-pointer text-sm">
                                            {uploadingField === `cat-${cat.id}` ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Загрузка...</> : "Загрузить картинку"}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                onChange={(e) => handleMediaUpload(e, `cat-${cat.id}`, true, cat.id)}
                                                disabled={uploadingField !== null}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
                <p className="text-sm text-gray-500">
                    Изменения моментально появятся на сайте Витрины.
                </p>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : success ? (
                        <Check className="w-5 h-5 mr-2" />
                    ) : null}
                    {success ? "Сохранено" : "Сохранить изменения"}
                </button>
            </div>
        </form>
    );
}

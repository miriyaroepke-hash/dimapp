"use client";

import { useState } from "react";
import { updateSiteContent, saveCategoryContent, saveCategoriesConfig } from "@/app/actions";
import { Check, Loader2, ExternalLink, Image, Eye, EyeOff, Trash2, Plus } from "lucide-react";

// Secret token to activate admin mode on storefront (stored in localStorage on vitrina)
const ADMIN_TOKEN = "dimmiani_admin_2024";

export interface MenuCategoryItem {
    id: string;
    label: string;
    label_kz?: string;
    isHidden?: boolean;
    href?: string;
    color?: string;
}

export const DEFAULT_CATEGORIES: MenuCategoryItem[] = [
    { id: 'new', label: 'Новинки', label_kz: 'Жаңалықтар', isHidden: false, href: '/products' },
    { id: 'dresses', label: 'Платья', label_kz: 'Көйлектер', isHidden: false },
    { id: 'pants', label: 'Брюки', label_kz: 'Шалбарлар', isHidden: false },
    { id: 'shirts', label: 'Рубашки', label_kz: 'Жейделер', isHidden: false },
    { id: 'skirts', label: 'Юбки', label_kz: 'Белдемшелер', isHidden: false },
    { id: 'suits', label: 'Костюмы', label_kz: 'Костюмдер', isHidden: false },
    { id: 'sale', label: 'SALE%', label_kz: 'SALE%', isHidden: false, href: '/sale', color: '#ff3b30' },
    { id: 'preorder', label: 'Предзаказ', label_kz: 'Алдын ала тапсырыс', isHidden: false, href: '/preorder', color: '#8b5cf6' },
];

function slugifyRu(str: string): string {
    const map: Record<string, string> = {
        а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'zh', з:'z', и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'shch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya'
    };
    return str.toLowerCase().trim().split('').map(ch => map[ch] !== undefined ? map[ch] : ch).join('').replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || ('cat_' + Date.now());
}

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
        faq_ru: initialData?.faq_ru || "",
        faq_kz: initialData?.faq_kz || "",
        club_ru: initialData?.club_ru || "",
        club_kz: initialData?.club_kz || "",
        about_ru: initialData?.about_ru || "",
        about_kz: initialData?.about_kz || "",
        privacy_ru: initialData?.privacy_ru || "",
        privacy_kz: initialData?.privacy_kz || "",
        oferta_ru: initialData?.oferta_ru || "",
        oferta_kz: initialData?.oferta_kz || "",

        size_guide_ru: initialData?.size_guide_ru || "",
        size_guide_kz: initialData?.size_guide_kz || "",
        how_to_order_ru: initialData?.how_to_order_ru || "",
        how_to_order_kz: initialData?.how_to_order_kz || "",
        consent_ru: initialData?.consent_ru || "",
                consent_kz: initialData?.consent_kz || "",
        show_blog: initialData?.show_blog ?? false,
    });
    const [categoryContents, setCategoryContents] = useState<Record<string, any>>(initialCategories || {});
    const [menuCategories, setMenuCategories] = useState<MenuCategoryItem[]>(() => {
        const raw = initialCategories?.['_categories_config_']?.text_ru;
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {}
        }
        return DEFAULT_CATEGORIES;
    });
    const [newCatLabelRu, setNewCatLabelRu] = useState("");
    const [newCatLabelKz, setNewCatLabelKz] = useState("");
    const [savingMenuCats, setSavingMenuCats] = useState(false);

    const persistMenuCategories = async (updatedList: MenuCategoryItem[]) => {
        setMenuCategories(updatedList);
        setSavingMenuCats(true);
        try {
            const res = await saveCategoriesConfig(updatedList);
            if (!res.success) alert("Ошибка сохранения меню категорий: " + res.error);
        } catch (e) {
            alert("Ошибка сохранения меню категорий");
        } finally {
            setSavingMenuCats(false);
        }
    };

    const handleAddMenuCategory = async () => {
        if (!newCatLabelRu.trim()) {
            alert("Введите название новой категории");
            return;
        }
        let id = slugifyRu(newCatLabelRu);
        if (menuCategories.some(c => c.id === id)) {
            id = id + "_" + Math.floor(Math.random() * 1000);
        }
        const newItem: MenuCategoryItem = {
            id,
            label: newCatLabelRu.trim(),
            label_kz: newCatLabelKz.trim() || newCatLabelRu.trim(),
            isHidden: false
        };
        const updated = [...menuCategories, newItem];
        setNewCatLabelRu("");
        setNewCatLabelKz("");
        await persistMenuCategories(updated);
    };

    const handleToggleCategoryVisibility = async (id: string) => {
        const updated = menuCategories.map(c => c.id === id ? { ...c, isHidden: !c.isHidden } : c);
        await persistMenuCategories(updated);
    };

    const handleDeleteMenuCategory = async (id: string, label: string) => {
        if (!confirm(`Удалить категорию «${label}» из меню?`)) return;
        const updated = menuCategories.filter(c => c.id !== id);
        await persistMenuCategories(updated);
    };
    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const [translatingField, setTranslatingField] = useState<string | null>(null);

    const handleCategoryTranslate = async (catId: string) => {
        const cat = categoryContents[catId] || {};
        const textToTranslate = cat.text_ru;
        if (!textToTranslate || !textToTranslate.trim()) {
            alert("Введите описание категории на русском для перевода");
            return;
        }

        setTranslatingField(`cat_${catId}`);
        try {
            const res = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: textToTranslate, targetLanguage: "Kazakh" }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Ошибка перевода");
            } else {
                setCategoryContents(prev => ({
                    ...prev,
                    [catId]: { ...prev[catId], text_kz: data.translatedText }
                }));
            }
        } catch (error) {
            alert("Не удалось связаться с сервером перевода");
        } finally {
            setTranslatingField(null);
        }
    };

    const handleTranslate = async (fieldNameRu: string, fieldNameKz: string) => {
        const textToTranslate = (form as any)[fieldNameRu];
        if (!textToTranslate || !textToTranslate.trim()) {
            alert("Введите текст на русском для перевода");
            return;
        }

        setTranslatingField(fieldNameRu);
        try {
            const res = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: textToTranslate, targetLanguage: "Kazakh" }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Ошибка перевода");
            } else {
                setForm(prev => ({ ...prev, [fieldNameKz]: data.translatedText }));
            }
        } catch (error) {
            alert("Не удалось связаться с сервером перевода");
        } finally {
            setTranslatingField(null);
        }
    };

    const insertMarkdown = (fieldId: string, prefix: string, suffix: string = "") => {
        const textarea = document.getElementById(fieldId) as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        const replacement = prefix + selectedText + suffix;

        const newValue = text.substring(0, start) + replacement + text.substring(end);
        setForm(prev => ({ ...prev, [fieldId]: newValue }));

        // Refocus and select
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
        }, 50);
    };

    const MarkdownToolbar = ({ fieldId, isCategory = false, catId = "" }: { fieldId: string, isCategory?: boolean, catId?: string }) => {
        const handleInsert = (prefix: string, suffix: string = "") => {
            if (isCategory) {
                const textarea = document.getElementById(`cat_${catId}_${fieldId}`) as HTMLTextAreaElement;
                if (!textarea) return;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                const selectedText = text.substring(start, end);
                const replacement = prefix + selectedText + suffix;
                const newValue = text.substring(0, start) + replacement + text.substring(end);
                setCategoryContents(prev => ({
                    ...prev,
                    [catId]: { ...prev[catId], [fieldId]: newValue }
                }));
                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
                }, 50);
            } else {
                insertMarkdown(fieldId, prefix, suffix);
            }
        };

        return (
            <div className="flex flex-wrap gap-1 bg-gray-50 border-b p-1.5 rounded-t text-xs select-none">
                <button type="button" onClick={() => handleInsert("**", "**")} className="px-2 py-1 font-bold border rounded bg-white hover:bg-gray-100" title="Жирный">B</button>
                <button type="button" onClick={() => handleInsert("*", "*")} className="px-2 py-1 italic border rounded bg-white hover:bg-gray-100" title="Курсив">I</button>
                <button type="button" onClick={() => handleInsert("# ")} className="px-2 py-1 border rounded bg-white hover:bg-gray-100 font-semibold" title="Заголовок 1">H1</button>
                <button type="button" onClick={() => handleInsert("## ")} className="px-2 py-1 border rounded bg-white hover:bg-gray-100 font-semibold" title="Заголовок 2">H2</button>
                <button type="button" onClick={() => handleInsert("- ")} className="px-2 py-1 border rounded bg-white hover:bg-gray-100" title="Список">• Список</button>
                <button type="button" onClick={() => handleInsert("[", "](url)")} className="px-2 py-1 border rounded bg-white hover:bg-gray-100" title="Ссылка">🔗 Ссылка</button>
            </div>
        );
    };

    const TranslateBtn = ({ fieldRu, fieldKz }: { fieldRu: string, fieldKz: string }) => {
        const isTranslating = translatingField === fieldRu;
        return (
            <button
                type="button"
                onClick={() => handleTranslate(fieldRu, fieldKz)}
                disabled={translatingField !== null}
                className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded text-xs font-semibold transition disabled:opacity-50"
            >
                {isTranslating ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Перевод...</>
                ) : (
                    <>✨ Перевести на казахский</>
                )}
            </button>
        );
    };

    const handleCategorySave = async (catId: string) => {
        setIsLoading(true);
        try {
            const cat = categoryContents[catId] || { id: catId };
            await saveCategoryContent(catId, cat.text_ru || "", cat.text_kz || "", cat.image);
            alert('Контент категории сохранен!');
        } catch (e) { alert('Ошибка.'); }
        finally { setIsLoading(false); }
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, isCat = false, catId = "", isTextAppend = false) => {
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
            } else if (isTextAppend) {
                setForm(prev => ({ ...prev, [fieldName]: prev[fieldName as keyof typeof prev] + `\n![описание](${data.secure_url})\n` }));
                alert("Картинка добавлена в конец текста. Вы можете вырезать ее и вставить в нужное место.");
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

    const vitrinaAdminUrl = `https://dimmiani.com/?adminToken=${ADMIN_TOKEN}`;

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
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-sm font-medium text-gray-700">Текст (Русский)</label>
                            <TranslateBtn fieldRu="text_ru" fieldKz="text_kz" />
                        </div>
                        <div className="border rounded-md shadow-sm">
                            <MarkdownToolbar fieldId="text_ru" />
                            <textarea
                                id="text_ru"
                                rows={3}
                                className="w-full p-2 focus:ring-0 focus:outline-none rounded-b-md text-sm border-t-0"
                                value={form.text_ru}
                                onChange={(e) => setForm({ ...form, text_ru: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Текст (Қазақша)</label>
                        <div className="border rounded-md shadow-sm">
                            <MarkdownToolbar fieldId="text_kz" />
                            <textarea
                                id="text_kz"
                                rows={3}
                                className="w-full p-2 focus:ring-0 focus:outline-none rounded-b-md text-sm border-t-0"
                                value={form.text_kz}
                                onChange={(e) => setForm({ ...form, text_kz: e.target.value })}
                            />
                        </div>
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
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-sm font-medium text-gray-700">Возвраты (Русский)</label>
                            <TranslateBtn fieldRu="returns_ru" fieldKz="returns_kz" />
                        </div>
                        <div className="border rounded-md shadow-sm">
                            <MarkdownToolbar fieldId="returns_ru" />
                            <textarea
                                id="returns_ru"
                                rows={4}
                                className="w-full p-2 focus:ring-0 focus:outline-none rounded-b-md text-sm border-t-0 font-mono"
                                value={form.returns_ru}
                                onChange={(e) => setForm({ ...form, returns_ru: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Возвраты (Қазақша)</label>
                        <div className="border rounded-md shadow-sm">
                            <MarkdownToolbar fieldId="returns_kz" />
                            <textarea
                                id="returns_kz"
                                rows={4}
                                className="w-full p-2 focus:ring-0 focus:outline-none rounded-b-md text-sm border-t-0 font-mono"
                                value={form.returns_kz}
                                onChange={(e) => setForm({ ...form, returns_kz: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>
            {/* УСЛОВИЯ ЗАКАЗА И ДОСТАВКИ */}
            <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold border-b pb-2">Условия заказа и доставки</h2>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-sm font-medium text-gray-700">Текст (Русский)</label>
                            <TranslateBtn fieldRu="terms_ru" fieldKz="terms_kz" />
                        </div>
                        <div className="border rounded-md shadow-sm">
                            <MarkdownToolbar fieldId="terms_ru" />
                            <textarea
                                id="terms_ru"
                                rows={4}
                                className="w-full p-2 focus:ring-0 focus:outline-none rounded-b-md text-sm border-t-0 font-mono"
                                value={form.terms_ru}
                                onChange={(e) => setForm({ ...form, terms_ru: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Текст (Қазақша)</label>
                        <div className="border rounded-md shadow-sm">
                            <MarkdownToolbar fieldId="terms_kz" />
                            <textarea
                                id="terms_kz"
                                rows={4}
                                className="w-full p-2 focus:ring-0 focus:outline-none rounded-b-md text-sm border-t-0 font-mono"
                                value={form.terms_kz}
                                onChange={(e) => setForm({ ...form, terms_kz: e.target.value })}
                            />
                        </div>
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
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-sm font-medium text-gray-700">Адреса и контакты (Русский)</label>
                            <TranslateBtn fieldRu="contacts_ru" fieldKz="contacts_kz" />
                        </div>
                        <div className="border rounded-md shadow-sm">
                            <MarkdownToolbar fieldId="contacts_ru" />
                            <textarea
                                id="contacts_ru"
                                rows={4}
                                className="w-full p-2 focus:ring-0 focus:outline-none rounded-b-md text-sm border-t-0 font-mono"
                                value={form.contacts_ru}
                                onChange={(e) => setForm({ ...form, contacts_ru: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Адреса и контакты (Қазақша)</label>
                        <div className="border rounded-md shadow-sm">
                            <MarkdownToolbar fieldId="contacts_kz" />
                            <textarea
                                id="contacts_kz"
                                rows={4}
                                className="w-full p-2 focus:ring-0 focus:outline-none rounded-b-md text-sm border-t-0 font-mono"
                                value={form.contacts_kz}
                                onChange={(e) => setForm({ ...form, contacts_kz: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* НОВЫЕ СТРАНИЦЫ (MARKDOWN) */}
            <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold border-b pb-2">Информационные страницы (Поддержка Markdown)</h2>
                <p className="text-sm text-gray-500 mb-4">Вы можете использовать жирный текст `**текст**`, заголовки `# Заголовок` и вставлять ссылки/картинки.</p>
                <div className="space-y-8">
                    {[
                        { id: 'faq', label: 'Часто задаваемые вопросы (FAQ)' },
                        { id: 'club', label: 'Клуб Dimmiani' },
                        { id: 'about', label: 'О нас' },
                        { id: 'privacy', label: 'Политика конфиденциальности' },
                        { id: 'oferta', label: 'Публичная оферта' },
                        { id: 'consent', label: 'Согласие на обработку персональных данных' },
                        { id: 'returns', label: 'Возврат' },
                        { id: 'terms', label: 'Условия доставки' },
                        { id: 'size_guide', label: 'Как выбрать размер' },
                        { id: 'how_to_order', label: 'Как оформить заказ' },
                    ].map(page => (
                        <div key={page.id} className="border p-4 rounded-lg bg-gray-50/50">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-lg">{page.label}</h3>
                                <div className="flex items-center gap-2">
                                    <label className="relative flex items-center px-3 py-1 bg-blue-50 text-blue-700 font-medium border border-blue-200 rounded hover:bg-blue-100 cursor-pointer transition text-xs">
                                        {uploadingField === `${page.id}_ru` ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Загрузка...</> : "Картинка (RU)"}
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleMediaUpload(e, `${page.id}_ru`, false, "", true)} disabled={uploadingField !== null} />
                                    </label>
                                    <label className="relative flex items-center px-3 py-1 bg-blue-50 text-blue-700 font-medium border border-blue-200 rounded hover:bg-blue-100 cursor-pointer transition text-xs">
                                        {uploadingField === `${page.id}_kz` ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Загрузка...</> : "Картинка (KZ)"}
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleMediaUpload(e, `${page.id}_kz`, false, "", true)} disabled={uploadingField !== null} />
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="flex justify-between items-end mb-1">
                                        <label className="block text-sm font-medium text-gray-700">Текст ({page.id.toUpperCase()} RU)</label>
                                        <TranslateBtn fieldRu={`${page.id}_ru`} fieldKz={`${page.id}_kz`} />
                                    </div>
                                    <div className="border rounded-md shadow-sm">
                                        <MarkdownToolbar fieldId={`${page.id}_ru`} />
                                        <textarea
                                            id={`${page.id}_ru`}
                                            rows={10}
                                            className="w-full p-3 focus:ring-0 focus:outline-none rounded-b-md font-mono text-sm leading-relaxed bg-white border-t-0"
                                            value={(form as any)[`${page.id}_ru`]}
                                            onChange={(e) => setForm({ ...form, [`${page.id}_ru`]: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Текст ({page.id.toUpperCase()} KZ)</label>
                                    <div className="border rounded-md shadow-sm">
                                        <MarkdownToolbar fieldId={`${page.id}_kz`} />
                                        <textarea
                                            id={`${page.id}_kz`}
                                            rows={10}
                                            className="w-full p-3 focus:ring-0 focus:outline-none rounded-b-md font-mono text-sm leading-relaxed bg-white border-t-0"
                                            value={(form as any)[`${page.id}_kz`]}
                                            onChange={(e) => setForm({ ...form, [`${page.id}_kz`]: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* КОНТЕНТ КАТЕГОРИЙ */}
            <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                    <div>
                        <h2 className="text-xl font-semibold">Категории каталога и Меню сайта</h2>
                        <p className="text-sm text-gray-500 mt-1">Добавляйте новые разделы в меню, скрывайте неактуальные или удаляйте их, а также настраивайте баннеры.</p>
                    </div>
                    {savingMenuCats && (
                        <span className="text-xs text-blue-600 flex items-center gap-1 font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Сохранение меню...
                        </span>
                    )}
                </div>

                {/* Форма добавления новой категории */}
                <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> Добавить новую категорию в меню
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Название (RU) *</label>
                            <input
                                type="text"
                                placeholder="Например: Жакеты"
                                value={newCatLabelRu}
                                onChange={e => setNewCatLabelRu(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Название (KZ)</label>
                            <input
                                type="text"
                                placeholder="Например: Жакеттер"
                                value={newCatLabelKz}
                                onChange={e => setNewCatLabelKz(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleAddMenuCategory}
                            disabled={savingMenuCats}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" /> Добавить в меню
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {menuCategories.map(cat => {
                        const content = categoryContents[cat.id] || {};
                        return (
                            <div key={cat.id} className={`border p-4 rounded-lg transition ${cat.isHidden ? 'bg-gray-100/80 border-gray-300 opacity-75' : 'bg-gray-50/50'}`}>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-200">
                                    <div className="flex items-center gap-2.5">
                                        <h3 className="font-semibold text-lg">{cat.label}</h3>
                                        {cat.label_kz && cat.label_kz !== cat.label && (
                                            <span className="text-xs text-gray-500">({cat.label_kz})</span>
                                        )}
                                        <span className="text-xs font-mono text-gray-400 bg-white px-2 py-0.5 rounded border">id: {cat.id}</span>
                                        {cat.isHidden ? (
                                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-700">
                                                Скрыта на сайте
                                            </span>
                                        ) : (
                                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
                                                Видна в меню
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleCategoryVisibility(cat.id)}
                                            disabled={savingMenuCats}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition ${
                                                cat.isHidden
                                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                            }`}
                                        >
                                            {cat.isHidden ? (
                                                <><Eye className="w-3.5 h-3.5" /> Показать в меню</>
                                            ) : (
                                                <><EyeOff className="w-3.5 h-3.5" /> Скрыть из меню</>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDeleteMenuCategory(cat.id, cat.label)}
                                            disabled={savingMenuCats}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Удалить
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between items-end mb-1">
                                                <label className="block text-sm font-medium text-gray-700">Описание категории (RU)</label>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCategoryTranslate(cat.id)}
                                                    disabled={translatingField !== null}
                                                    className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded text-xs font-semibold transition disabled:opacity-50"
                                                >
                                                    {translatingField === `cat_${cat.id}` ? (
                                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Перевод...</>
                                                    ) : (
                                                        <>✨ Перевести на казахский</>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="border rounded-md shadow-sm">
                                                <MarkdownToolbar fieldId="text_ru" isCategory={true} catId={cat.id} />
                                                <textarea
                                                    id={`cat_${cat.id}_text_ru`}
                                                    rows={3}
                                                    className="w-full p-2 focus:ring-0 focus:outline-none rounded-b-md text-sm border-t-0 bg-white"
                                                    value={content.text_ru || ''}
                                                    onChange={e => setCategoryContents(prev => ({ ...prev, [cat.id]: { ...prev[cat.id], text_ru: e.target.value } }))}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Описание категории (KZ)</label>
                                            <div className="border rounded-md shadow-sm">
                                                <MarkdownToolbar fieldId="text_kz" isCategory={true} catId={cat.id} />
                                                <textarea
                                                    id={`cat_${cat.id}_text_kz`}
                                                    rows={3}
                                                    className="w-full p-2 focus:ring-0 focus:outline-none rounded-b-md text-sm border-t-0 bg-white"
                                                    value={content.text_kz || ''}
                                                    onChange={e => setCategoryContents(prev => ({ ...prev, [cat.id]: { ...prev[cat.id], text_kz: e.target.value } }))}
                                                />
                                            </div>
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

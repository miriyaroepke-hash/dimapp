"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBlogPost, updateBlogPost } from "@/app/actions";
import { Image as ImageIcon, Loader2 } from "lucide-react";

export default function BlogEditor({ initialPost }: { initialPost: any }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [form, setForm] = useState({
        title_ru: initialPost?.title_ru || "",
        title_kz: initialPost?.title_kz || "",
        slug: initialPost?.slug || "",
        excerpt_ru: initialPost?.excerpt_ru || "",
        excerpt_kz: initialPost?.excerpt_kz || "",
        content_ru: initialPost?.content_ru || "",
        content_kz: initialPost?.content_kz || "",
        image: initialPost?.image || "",
        isPublished: initialPost ? initialPost.isPublished : true,
    });

    // Auto-generate slug from ru title if slug is empty
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        if (!initialPost && form.slug === "") {
            const generatedSlug = title
                .toLowerCase()
                .replace(/[^a-z0-9а-яё]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            // simple cyrillic to latin map
            const cyrillicToLatin: Record<string, string> = {
                'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
                'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
                'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c',
                'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
            };
            const latinSlug = generatedSlug.split('').map(char => cyrillicToLatin[char] || char).join('');
            setForm({ ...form, title_ru: title, slug: latinSlug });
        } else {
            setForm({ ...form, title_ru: title });
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isContentImage: boolean = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const signRes = await fetch("/api/cloudinary-sign", { method: "POST" });
            const signData = await signRes.json();
            
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);
            uploadFormData.append("api_key", signData.apiKey);
            uploadFormData.append("timestamp", signData.timestamp);
            uploadFormData.append("signature", signData.signature);
            uploadFormData.append("folder", signData.folder);

            const uploadUrl = `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`;
            const res = await fetch(uploadUrl, { method: "POST", body: uploadFormData });
            const data = await res.json();

            if (isContentImage) {
                // Insert into content_ru
                const imageMarkdown = `\n![описание](${data.secure_url})\n`;
                setForm(prev => ({ ...prev, content_ru: prev.content_ru + imageMarkdown }));
                alert("Картинка добавлена в конец текста (RU). Вы можете вырезать ее и вставить в нужное место.");
            } else {
                setForm(prev => ({ ...prev, image: data.secure_url }));
            }
        } catch (err) {
            alert("Ошибка загрузки картинки");
        } finally {
            setUploadingImage(false);
            e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (initialPost) {
                await updateBlogPost(initialPost.id, form);
            } else {
                await createBlogPost(form);
            }
            router.push("/cms/blog");
        } catch (error) {
            alert("Ошибка сохранения");
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-semibold">Основные настройки</h2>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={form.isPublished} 
                            onChange={e => setForm({...form, isPublished: e.target.checked})}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="font-medium text-gray-700">Опубликовано</span>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Название (RU) *</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.title_ru}
                            onChange={handleTitleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Название (KZ)</label>
                        <input 
                            type="text" 
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.title_kz}
                            onChange={e => setForm({...form, title_kz: e.target.value})}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL статьи (Slug) *</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.slug}
                            onChange={e => setForm({...form, slug: e.target.value})}
                            placeholder="primer-stati"
                        />
                        <p className="text-xs text-gray-500 mt-1">Ссылка будет выглядеть так: dimmiani.kz/blog/{form.slug || '...'}</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Обложка статьи</label>
                    <div className="flex items-center gap-4">
                        {form.image ? (
                            <img src={form.image} alt="Cover" className="w-48 h-32 object-cover rounded shadow-sm" />
                        ) : (
                            <div className="w-48 h-32 bg-gray-100 flex items-center justify-center rounded text-gray-400">
                                <ImageIcon className="w-8 h-8" />
                            </div>
                        )}
                        <label className="relative flex items-center px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer transition">
                            {uploadingImage ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : "Загрузить обложку"}
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, false)} disabled={uploadingImage} />
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
                <h2 className="text-xl font-semibold border-b pb-4">Краткое описание (для списка статей)</h2>
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Описание (RU)</label>
                        <textarea 
                            rows={3}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.excerpt_ru}
                            onChange={e => setForm({...form, excerpt_ru: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Описание (KZ)</label>
                        <textarea 
                            rows={3}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.excerpt_kz}
                            onChange={e => setForm({...form, excerpt_kz: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-semibold">Контент статьи (Markdown)</h2>
                    <label className="relative flex items-center px-4 py-2 bg-blue-50 text-blue-700 font-medium border border-blue-200 rounded hover:bg-blue-100 cursor-pointer transition text-sm">
                        {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Загрузить картинку в текст"}
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, true)} disabled={uploadingImage} />
                    </label>
                </div>
                <p className="text-sm text-gray-500 mb-2">Вы можете использовать жирный текст `**текст**`, заголовки `# Заголовок` и вставлять ссылки.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Текст статьи (RU) *</label>
                        <textarea 
                            required
                            rows={20}
                            className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed"
                            value={form.content_ru}
                            onChange={e => setForm({...form, content_ru: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Текст статьи (KZ)</label>
                        <textarea 
                            rows={20}
                            className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed"
                            value={form.content_kz}
                            onChange={e => setForm({...form, content_kz: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <button 
                    type="button" 
                    onClick={() => router.push("/cms/blog")}
                    className="px-6 py-2 border rounded font-medium hover:bg-gray-50 transition"
                >
                    Отмена
                </button>
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
                >
                    {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                    Сохранить статью
                </button>
            </div>
        </form>
    );
}

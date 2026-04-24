"use client";

import { useState } from "react";
import { updateSiteContent } from "@/app/actions";
import { Check, Loader2 } from "lucide-react";

export default function CmsForm({ initialData }: { initialData: any }) {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [form, setForm] = useState({
        text_ru: initialData?.text_ru || "",
        text_kz: initialData?.text_kz || "",
        video_url: initialData?.video_url || "",
        video2_url: initialData?.video2_url || "",
        video3_url: initialData?.video3_url || "",
        returns_ru: initialData?.returns_ru || "",
        returns_kz: initialData?.returns_kz || "",
        contacts_ru: initialData?.contacts_ru || "",
        contacts_kz: initialData?.contacts_kz || "",
    });
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setUploadingField(fieldName);
        try {
            const formData = new FormData();
            formData.append("file", file);
            
            const res = await fetch("/api/upload-video", {
                method: "POST",
                body: formData,
            });
            
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || "Upload failed");
            
            setForm(prev => ({ ...prev, [fieldName]: data.url }));
        } catch (err: any) {
            alert("Ошибка при загрузке видео: " + err.message);
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

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-8 bg-white p-6 rounded-lg shadow-sm border">
            {/* ТЕКСТЫ ГЛАВНОГО ЭКРАНА */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">Главный экран (Тексты)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Текст (Русский)</label>
                        <textarea 
                            rows={3}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.text_ru}
                            onChange={(e) => setForm({...form, text_ru: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Текст (Қазақша)</label>
                        <textarea 
                            rows={3}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.text_kz}
                            onChange={(e) => setForm({...form, text_kz: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            {/* ВИДЕО */}
            <div className="space-y-6">
                <h2 className="text-xl font-semibold border-b pb-2">Медиа (Видео на главной)</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Видео 1 (Большое верхнее)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                placeholder="https://.../video.mp4"
                                className="flex-1 border p-2 rounded focus:ring-2 focus:ring-blue-500"
                                value={form.video_url}
                                onChange={(e) => setForm({...form, video_url: e.target.value})}
                            />
                            <label className="relative flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded hover:bg-blue-100 transition cursor-pointer overflow-hidden border border-blue-200">
                                {uploadingField === 'video_url' ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Загрузка...</>
                                ) : (
                                    <>Загрузить файл</>
                                )}
                                <input 
                                    type="file" 
                                    accept="video/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    onChange={(e) => handleVideoUpload(e, 'video_url')}
                                    disabled={uploadingField !== null}
                                />
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Видео 2 (Левое нижнее)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                placeholder="https://.../video2.mp4"
                                className="flex-1 border p-2 rounded focus:ring-2 focus:ring-blue-500"
                                value={form.video2_url}
                                onChange={(e) => setForm({...form, video2_url: e.target.value})}
                            />
                            <label className="relative flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded hover:bg-blue-100 transition cursor-pointer overflow-hidden border border-blue-200">
                                {uploadingField === 'video2_url' ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Загрузка...</>
                                ) : (
                                    <>Загрузить файл</>
                                )}
                                <input 
                                    type="file" 
                                    accept="video/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    onChange={(e) => handleVideoUpload(e, 'video2_url')}
                                    disabled={uploadingField !== null}
                                />
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Видео 3 (Правое нижнее)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                placeholder="https://.../video3.mp4"
                                className="flex-1 border p-2 rounded focus:ring-2 focus:ring-blue-500"
                                value={form.video3_url}
                                onChange={(e) => setForm({...form, video3_url: e.target.value})}
                            />
                            <label className="relative flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded hover:bg-blue-100 transition cursor-pointer overflow-hidden border border-blue-200">
                                {uploadingField === 'video3_url' ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Загрузка...</>
                                ) : (
                                    <>Загрузить файл</>
                                )}
                                <input 
                                    type="file" 
                                    accept="video/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    onChange={(e) => handleVideoUpload(e, 'video3_url')}
                                    disabled={uploadingField !== null}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* ВОЗВРАТЫ */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">Политика возврата</h2>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Возвраты (Русский)</label>
                        <textarea 
                            rows={4}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.returns_ru}
                            onChange={(e) => setForm({...form, returns_ru: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Возвраты (Қазақша)</label>
                        <textarea 
                            rows={4}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.returns_kz}
                            onChange={(e) => setForm({...form, returns_kz: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            {/* КОНТАКТЫ */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">Контакты</h2>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Адреса и контакты (Русский)</label>
                        <textarea 
                            rows={4}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.contacts_ru}
                            onChange={(e) => setForm({...form, contacts_ru: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Адреса и контакты (Қазақша)</label>
                        <textarea 
                            rows={4}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                            value={form.contacts_kz}
                            onChange={(e) => setForm({...form, contacts_kz: e.target.value})}
                        />
                    </div>
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

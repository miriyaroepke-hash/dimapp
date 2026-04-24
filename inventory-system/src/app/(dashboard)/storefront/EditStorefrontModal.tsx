"use client";

import { useState } from "react";
import { Loader2, X, Upload } from "lucide-react";
import { updateStorefrontProduct } from "@/app/actions";

interface StorefrontProduct {
    id: number;
    name: string;
    description: string | null;
    image: string | null;
    images: string[];
    video: string | null;
}

interface Props {
    product: StorefrontProduct;
    onClose: () => void;
    onSuccess: () => void;
}

const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error("Canvas to Blob failed"));
                        }
                    },
                    "image/jpeg",
                    0.85
                );
            };
            img.onerror = () => reject(new Error("Image load error"));
        };
        reader.onerror = () => reject(new Error("File read error"));
    });
};

export default function EditStorefrontModal({ product, onClose, onSuccess }: Props) {
    const [name, setName] = useState(product.name);
    const [description, setDescription] = useState(product.description || "");
    const [video, setVideo] = useState(product.video || "");
    const [images, setImages] = useState<string[]>(product.images?.length > 0 ? product.images : (product.image ? [product.image] : []));
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Local preview skipped for now during multi-image upload
        setUploadingImage(true);

        try {
            let processedFile = file;

            if (file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif") || file.type === "image/heic") {
                // @ts-ignore
                const heic2any = (await import("heic2any")).default;
                const convertedBlob = await heic2any({
                    blob: file,
                    toType: "image/jpeg",
                    quality: 0.8
                });
                const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                processedFile = new File([finalBlob], file.name.replace(/\.heic$|\.heif$/i, ".jpg"), {
                    type: "image/jpeg"
                });
            }

            const compressedBlob = await compressImage(processedFile);
            const formData = new FormData();
            formData.append("file", compressedBlob, "storefront_image.jpg");

            const res = await fetch("/api/upload-image", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.details || data.error || "Upload failed");
            }
            setImages(prev => [...prev, data.url].slice(0, 5));
        } catch (err) {
            console.error("Image upload failed:", err);
            alert("Не удалось загрузить фото. Возможно, оно слишком большое или не поддерживается.");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return alert("Имя не может быть пустым");
        
        setIsSaving(true);
        try {
            const res = await updateStorefrontProduct(product.id, {
                name: name.trim(),
                description: description.trim() || null,
                video: video.trim() || null,
                images: images,
                image: images.length > 0 ? images[0] : null // Fallback for backwards compatibility
            });
            if (res.success) {
                onSuccess();
            } else {
                alert(res.error || "Ошибка сети");
            }
        } catch (error) {
            alert("Произошла ошибка при сохранении");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                    <h2 className="text-xl font-bold">Редактировать Витрину</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-black">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Название на сайте</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Описание (опционально)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Например: Платье свободного кроя..."
                            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ссылка на видео (Instagram Reels, YouTube Shorts)</label>
                        <input
                            type="text"
                            value={video}
                            onChange={(e) => setVideo(e.target.value)}
                            placeholder="https://instagram.com/reel/..."
                            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Фотографии (До 5 штук)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {images.map((imgUrl, idx) => (
                                <div key={idx} className="relative group border rounded-lg overflow-hidden h-24 bg-gray-100">
                                    <img src={imgUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                                        title="Удалить фото"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            {images.length < 5 && (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg h-24 flex flex-col items-center justify-center hover:bg-gray-50 transition cursor-pointer relative overflow-hidden text-gray-400">
                                    <input
                                        type="file"
                                        accept="image/*,.heic,.heif"
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        disabled={uploadingImage}
                                    />
                                    {uploadingImage ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6 mb-1" />
                                            <span className="text-[10px] font-medium text-center leading-tight">Добавить<br/>фото</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Первое фото будет обложкой. Поддерживаются форматы HEIC (с iPhone).</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 transition"
                            disabled={isSaving || uploadingImage}
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || uploadingImage || !name.trim()}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow flex items-center transition disabled:opacity-50"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

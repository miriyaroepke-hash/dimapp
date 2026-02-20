import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function generateEAN13() {
    // Simple generator: 20 + 10 digits + checksum
    // Prefix 20 (internal use)
    const prefix = "20";
    let code = prefix;
    for (let i = 0; i < 10; i++) {
        code += Math.floor(Math.random() * 10);
    }

    // Calculate checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(code[i]);
        sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checksum = (10 - (sum % 10)) % 10;
    return code + checksum;
}

import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<string> {
    const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: "image/jpeg"
    };

    try {
        const compressedFile = await imageCompression(file, options);
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(compressedFile);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    } catch (error) {
        console.error("Image compression failed:", error);
        throw error;
    }
}

export function formatCdekPhone(phone: string): string {
    // Keep only + and digits
    const cleaned = phone.replace(/[^\d+]/g, '');

    // If it starts with 8, replace with +7
    if (cleaned.startsWith('8')) {
        return '+7' + cleaned.slice(1);
    }

    // If it starts with 7 but no plus, add +
    if (cleaned.startsWith('7')) {
        return '+' + cleaned;
    }

    // If it doesn't start with +7, you might want to prepend it, but let's just return cleaned
    // and let the validator handle it.
    if (!cleaned.startsWith('+') && cleaned.length > 0) {
        return '+7' + cleaned;
    }

    return cleaned;
}

export function isValidCdekPhone(phone: string): boolean {
    return /^\+7\d{10}$/.test(phone);
}

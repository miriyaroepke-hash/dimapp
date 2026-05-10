import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Allow large video/image uploads
export const maxDuration = 120;

function uploadToCloudinary(buffer: Buffer, options: object): Promise<any> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
        stream.end(buffer);
    });
}

export async function POST(req: NextRequest) {
    // Configure on each request to always use fresh env vars
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const isVideo = file.type.startsWith('video/');

        const result = await uploadToCloudinary(buffer, {
            folder: 'inventory_showcase_content',
            resource_type: isVideo ? 'video' : 'image',
            ...(isVideo ? { quality: 'auto', fetch_format: 'mp4' } : {}),
        });

        return NextResponse.json({ url: result.secure_url });
    } catch (error: any) {
        console.error('Cloudinary video upload error:', error);
        return NextResponse.json(
            { error: 'Upload failed', details: error?.message || String(error) },
            { status: 500 }
        );
    }
}

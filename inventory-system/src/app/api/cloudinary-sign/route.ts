import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export async function POST() {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const timestamp = Math.round((new Date).getTime() / 1000);
    const folder = 'inventory_showcase_content';
    
    const paramsToSign = {
        timestamp: timestamp,
        folder: folder,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET as string);

    return NextResponse.json({
        timestamp,
        signature,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder: folder
    });
}

import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
        tokenPrefix: process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.substring(0, 5) : null,
        hasChat: !!process.env.TELEGRAM_CHAT_ID,
        chat: process.env.TELEGRAM_CHAT_ID || null
    });
}

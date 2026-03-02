import { NextResponse } from "next/server";
import { syncKaspiOrders } from "@/app/actions";

// This route will be triggered by Vercel Cron
export async function GET(request: Request) {
    // Basic security block if you are using it manually too, verify an auth header.
    // Vercel Cron automatically adds a specific header, but for simplicity we rely on Vercel's Edge network security if configured, or just run it.

    // Auth check for Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        // Only enforce in prod if CRON_SECRET is set, to prevent random web scraping from syncing
        if (process.env.CRON_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        console.log("Starting automated Kaspi Sync (Cron)");
        const result = await syncKaspiOrders();
        console.log("Automated Kaspi Sync result:", result);
        return NextResponse.json(result);
    } catch (e: any) {
        console.error("Cron Kaspi Sync fell over:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

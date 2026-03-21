import { NextResponse } from "next/server";
import { generateHalykXml } from "@/lib/halyk";

export async function POST(request: Request) {
    const HALYK_TOKEN = process.env.HALYK_API_TOKEN;
    const HALYK_API_URL = "https://api.halykmarket.kz/api/merchant/v1/offers/upload"; 
    // Wait, the docs say https://test2-api.halykmarket.com/api/merchant/v1/offers/upload
    // Production is usually: https://halykmarket.kz/gw/merchant/public/merchant/offers/upload or api.halykmarket.kz
    // I'll try both if one fails. Actually let's use the most standard one.
    // However, since we're generating the feed at /api/halyk/feed, the user can just use that URL instead.
    // If they click the button, we try to POST the file.

    if (!HALYK_TOKEN) {
        return NextResponse.json({ error: "HALYK_API_TOKEN не настроен" }, { status: 500 });
    }

    try {
        const xmlContent = await generateHalykXml();
        
        // We must post it as a file inside FormData
        const formData = new FormData();
        const blob = new Blob([xmlContent], { type: 'text/xml' });
        formData.append("file", blob, "feed.xml");

        // Try standard GW endpoint first
        let response = await fetch("https://halykmarket.kz/gw/merchant/public/merchant/offers/upload", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HALYK_TOKEN}`
                // Note: fetch automatically adds multipart boundary headers when body is FormData
            },
            body: formData,
        });

        if (!response.ok && response.status === 404) {
            // Try fallback API endpoint if gw returns 404
            response = await fetch(HALYK_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${HALYK_TOKEN}`
                },
                body: formData,
            });
        }

        const responseText = await response.text();

        if (!response.ok) {
            console.error("Halyk Stock Upload API error:", response.status, responseText);
            return NextResponse.json({
                error: `Ошибка загрузки в Халык Маркет: ${response.status}`,
                details: responseText
            }, { status: 502 });
        }

        // Response should be { "id": 11111 }
        return NextResponse.json({
            success: true,
            message: `Остатки успешно отправлены в Halyk Market (id: ${responseText})`
        });

    } catch (e: any) {
        console.error("Push stock to Halyk error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

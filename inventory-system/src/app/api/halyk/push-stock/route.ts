import { NextResponse } from "next/server";
import { generateHalykXml } from "@/lib/halyk";

export async function POST(request: Request) {
    const HALYK_TOKEN = process.env.HALYK_API_TOKEN;
    
    // undocumented production URLs for Halyk
    const possibleUrls = [
        "https://api.halykmarket.kz/api/merchant/v1/offers/upload",
        "https://halykmarket.kz/gw/merchant/public/merchant/offers/upload",
        "https://halykmarket.kz/api/merchant/v1/offers/upload",
        "https://market.halykbank.kz/api/merchant/v1/offers/upload"
    ];

    if (!HALYK_TOKEN) {
        return NextResponse.json({ error: "HALYK_API_TOKEN не настроен" }, { status: 500 });
    }

    try {
        const xmlContent = await generateHalykXml();
        
        let lastErrorText = "";
        let lastStatus = 500;

        for (const url of possibleUrls) {
            try {
                const formData = new FormData();
                const blob = new Blob([xmlContent], { type: 'text/xml' });
                formData.append("file", blob, "feed.xml");

                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${HALYK_TOKEN}`
                    },
                    body: formData,
                });

                const responseText = await response.text();

                if (response.ok) {
                    return NextResponse.json({
                        success: true,
                        message: `Остатки успешно отправлены в Halyk Market (URL: ${url}, id: ${responseText})`
                    });
                } else {
                    lastStatus = response.status;
                    lastErrorText = responseText;
                    console.error(`Halyk API upload failed for ${url} with status ${response.status}`, responseText);
                }
            } catch (e: any) {
                console.error(`Fetch failed for ${url}`, e.message);
                lastErrorText = e.message;
            }
        }

        return NextResponse.json({
            error: `Ошибка выгрузки во всех вариантах API (последний код: ${lastStatus})`,
            details: lastErrorText
        }, { status: 502 });

    } catch (e: any) {
        console.error("Push stock to Halyk error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

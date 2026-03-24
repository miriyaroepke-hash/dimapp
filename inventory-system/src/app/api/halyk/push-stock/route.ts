import { NextResponse } from "next/server";
import { generateHalykXml } from "@/lib/halyk";

export async function POST(request: Request) {
    const HALYK_TOKEN = process.env.HALYK_API_TOKEN;
    
    // According to Halyk Market Docs, the production domain is api.halykmarket.com
    const possibleDomain = "https://api.halykmarket.com"; 
    // Fallback if .com gives 404 (Kazakhstan often uses .kz)
    const fallbackDomain = "https://api.halykmarket.kz";

    if (!HALYK_TOKEN) {
        return NextResponse.json({ error: "HALYK_API_TOKEN не настроен" }, { status: 500 });
    }

    try {
        const xmlContent = await generateHalykXml();
        
        const uploadFile = async (domain: string) => {
            const formData = new FormData();
            const blob = new Blob([xmlContent], { type: 'text/xml' });
            formData.append("file", blob, "feed.xml");

            const response = await fetch(`${domain}/api/merchant/v1/offers/upload`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${HALYK_TOKEN}`
                },
                body: formData,
            });

            return response;
        };

        // Try standard domain first
        let response = await uploadFile(possibleDomain);
        let usedDomain = possibleDomain;

        if (response.status === 404) {
             response = await uploadFile(fallbackDomain);
             usedDomain = fallbackDomain;
        }

        const responseText = await response.text();

        if (!response.ok) {
            console.error(`Halyk API upload failed (domain: ${usedDomain}) with status ${response.status}`, responseText);
            return NextResponse.json({
                error: `Ошибка выгрузки в Халык Маркет (${response.status === 403 ? "Включите API загрузку в настройках!" : response.status})`,
                details: responseText
            }, { status: 502 });
        }

        // Response should be { "id": 11111 }
        let uploadId: string | null = null;
        try {
            const jsonStr = JSON.parse(responseText);
            uploadId = jsonStr.id;
        } catch (e) {
            console.warn("Could not parse numeric ID out of Halyk upload string", responseText);
            // Sometimes it comes back just as the number itself or plain text
            uploadId = responseText.replace(/\D/g, "");
        }

        if (!uploadId) {
             return NextResponse.json({
                success: true,
                message: `Файл успешно загружен в Halyk Market, но не удалось отследить статус (Ответ: ${responseText})`
            });
        }

        // Delay a few seconds to let Halyk Market process the XML
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Periodically poll the status up to 5 times (total 15 seconds)
        for (let tries = 0; tries < 5; tries++) {
             const statusRes = await fetch(`${usedDomain}/api/merchant/v1/offers/upload/status/${uploadId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${HALYK_TOKEN}`,
                    "Content-Type": "application/json"
                }
             });

             if (statusRes.ok) {
                 const statusData = await statusRes.json();
                 
                 // "CREATED" or "PROCESSING" means we need to wait
                 if (statusData.status === "COMPLETED") {
                    return NextResponse.json({
                        success: true,
                        message: `ХАЛЫК: Готово! Успешно обновлено: ${statusData.successCount}. Ошибок: ${statusData.failCount}.`
                    });
                 } else if (statusData.status === "FAILED") {
                    return NextResponse.json({
                        success: false,
                        error: `Халык отверг файл или нашел ошибку. Причина: ${statusData.message || "Неизвестно"}`,
                    }, { status: 400 });
                 } else if (statusData.status === "SKIPPED") {
                    return NextResponse.json({
                        success: true,
                        message: `ХАЛЫК: Файл не обработан, так как остатки не изменились (SKIPPED).`
                    });
                 }
                 
             }
             // Wait before polling again
             await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Fallback if processing takes too long
        return NextResponse.json({
            success: true,
            message: `Файл загружен в Халык Маркет (ID: ${uploadId}), но они обрабатывают его слишком долго. Можете закрывать.`
        });

    } catch (e: any) {
        console.error("Push stock to Halyk error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}


import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/cdek";

const CDEK_API_URL = process.env.CDEK_API_URL || "https://api.cdek.ru/v2";


export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uuid: string }> }
) {
    try {
        const { uuid } = await params;
        const token = await getAccessToken();

        console.log(`[CDEK Proxy] Requesting print task: ${uuid}`);

        let pdfUrl: string | null = null;
        let attempts = 0;
        const maxAttempts = 10; // 10 attempts * 1s = 10s timeout (should be enough)

        // 1. Poll for task completion
        while (attempts < maxAttempts) {
            const response = await fetch(`${CDEK_API_URL}/print/orders/${uuid}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) {
                console.error(`[CDEK Proxy] Status check failed: ${response.status}`);
                throw new Error(`CDEK API Error: ${response.status}`);
            }

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/pdf")) {
                // Unexpected but possible: returns PDF directly
                console.log("[CDEK Proxy] CDEK returned PDF directly");
                const buffer = Buffer.from(await response.arrayBuffer());
                return new NextResponse(buffer, {
                    headers: {
                        "Content-Type": "application/pdf",
                        "Content-Disposition": `inline; filename="cdek-${uuid}.pdf"`
                    }
                });
            }

            const data = await response.json();
            if (data.entity && data.entity.url) {
                pdfUrl = data.entity.url;
                console.log(`[CDEK Proxy] PDF URL found: ${pdfUrl}`);
                break;
            }

            console.log(`[CDEK Proxy] Task not ready. Waiting... (Attempt ${attempts + 1}/${maxAttempts})`);
            attempts++;
            await new Promise(r => setTimeout(r, 1000));
        }

        if (!pdfUrl) {
            return NextResponse.json({ error: "Print task timeout. Try again later." }, { status: 504 });
        }

        // 2. Fetch the actual PDF
        console.log(`[CDEK Proxy] Fetching PDF content...`);
        const pdfResponse = await fetch(pdfUrl, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!pdfResponse.ok) {
            console.error(`[CDEK Proxy] Failed to fetch PDF file: ${pdfResponse.status}`);
            return NextResponse.json({ error: "Failed to download PDF" }, { status: pdfResponse.status });
        }

        const buffer = Buffer.from(await pdfResponse.arrayBuffer());

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="cdek-waybills-${uuid}.pdf"`
            }
        });

    } catch (e: any) {
        console.error("PDF Proxy Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}


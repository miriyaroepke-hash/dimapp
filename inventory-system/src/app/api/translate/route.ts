import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { text, targetLanguage = "Kazakh" } = await req.json();

        if (!text || !text.trim()) {
            return NextResponse.json({ error: "Текст для перевода пуст" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({
                error: "ИИ-перевод не настроен. Пожалуйста, добавьте GEMINI_API_KEY в файл .env. Вы можете получить бесплатный ключ в Google AI Studio."
            }, { status: 501 });
        }

        const prompt = `Translate the following Russian text into professional, natural sounding ${targetLanguage}. 
Keep the markdown formatting (like bold **, italic *, headings #, list items -, links [text](url), images ![desc](url)) exactly the same.
Do not add any explanations, extra notes, or conversational text. Return ONLY the translated markdown text.

Russian text:
${text}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API Error:", data);
            return NextResponse.json({
                error: `Ошибка Gemini API: ${data.error?.message || "Неизвестная ошибка"}`
            }, { status: response.status });
        }

        const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!translatedText) {
            return NextResponse.json({ error: "Не удалось получить ответ от ИИ" }, { status: 500 });
        }

        return NextResponse.json({ translatedText: translatedText.trim() });
    } catch (error: any) {
        console.error("Translate API Error:", error);
        return NextResponse.json({ error: error.message || "Ошибка сервера" }, { status: 500 });
    }
}

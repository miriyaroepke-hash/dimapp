export async function sendTelegramMessage(message: string) {
    // Force sending to the group chat only
    const botToken = '8265144846:AAGRAFhMQ-eplanFEbmqnbFCy9y4rJwbdgE';
    const chatIdEnv = '-1001807702533';

    if (!botToken || !chatIdEnv) {
        console.warn("Telegram Token or Chat ID is missing. Message not sent.");
        return;
    }

    const chatIds = chatIdEnv.split(",").map(id => id.trim()).filter(Boolean);

    for (const chatId of chatIds) {
        try {
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
        } catch (e) {
            console.error(`Failed to send Telegram message to ${chatId}`, e);
        }
    }
}

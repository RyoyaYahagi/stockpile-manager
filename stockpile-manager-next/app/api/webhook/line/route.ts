import { NextRequest, NextResponse } from "next/server";

const LINE_REPLY_API = "https://api.line.me/v2/bot/message/reply";

export async function POST(request: NextRequest) {
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        return NextResponse.json({ error: "No Access Token" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const events = body.events;

        if (!events || events.length === 0) {
            return NextResponse.json({ message: "No events" });
        }

        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const userId = event.source.userId;
                const replyToken = event.replyToken;

                if (!userId) continue;

                // ユーザーIDを返信する
                await fetch(LINE_REPLY_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
                    },
                    body: JSON.stringify({
                        replyToken,
                        messages: [{
                            type: 'text',
                            text: `あなたのUser IDはこちらです：\n${userId}\n\nこのIDをアプリの「LINE連携設定」に入力してください。`
                        }]
                    })
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

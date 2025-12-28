import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lineLinkTokens, users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

export const runtime = 'edge';

const LINE_REPLY_API = "https://api.line.me/v2/bot/message/reply";

// LINEに返信を送信
async function replyToLine(replyToken: string, message: string) {
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) return;

    await fetch(LINE_REPLY_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
            replyToken,
            messages: [{ type: 'text', text: message }]
        })
    });
}

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
            const lineUserId = event.source?.userId;
            const replyToken = event.replyToken;

            if (!lineUserId) continue;

            // 友だち追加イベント
            if (event.type === 'follow') {
                await replyToLine(replyToken,
                    '備蓄管理アプリへようこそ！🎉\n\n' +
                    'アプリとLINEを連携するには、アプリに表示された6桁のコードをこちらに送信してください。\n\n' +
                    '例: ABC123'
                );
                continue;
            }

            // テキストメッセージ（リンクコードの可能性）
            if (event.type === 'message' && event.message.type === 'text') {
                const messageText = event.message.text.trim().toUpperCase();

                // 6桁のコードかチェック（英数字のみ）
                if (/^[0-9A-Z]{6}$/.test(messageText)) {
                    // リンクトークンを検索
                    const linkToken = await db.query.lineLinkTokens.findFirst({
                        where: and(
                            eq(lineLinkTokens.token, messageText),
                            eq(lineLinkTokens.used, false),
                            gt(lineLinkTokens.expiresAt, new Date())
                        ),
                    });

                    if (linkToken) {
                        // ユーザーのlineUserIdを更新
                        await db.update(users)
                            .set({ lineUserId: lineUserId })
                            .where(eq(users.id, linkToken.userId));

                        // トークンを使用済みにする
                        await db.update(lineLinkTokens)
                            .set({ used: true })
                            .where(eq(lineLinkTokens.id, linkToken.id));

                        await replyToLine(replyToken,
                            '✅ LINE連携が完了しました！\n\n' +
                            'これで備蓄品の期限切れ通知をLINEで受け取れます。\n\n' +
                            '通知タイミング:\n' +
                            '・30日前\n' +
                            '・7日前\n' +
                            '・当日'
                        );
                    } else {
                        await replyToLine(replyToken,
                            '❌ コードが見つかりませんでした。\n\n' +
                            '以下を確認してください:\n' +
                            '・コードが正しいか\n' +
                            '・有効期限（10分）が切れていないか\n\n' +
                            'アプリで新しいコードを発行してお試しください。'
                        );
                    }
                } else {
                    // その他のメッセージ
                    await replyToLine(replyToken,
                        '📱 備蓄管理アプリからの通知をお届けします。\n\n' +
                        'LINE連携をするには、アプリに表示された6桁のコードを送信してください。'
                    );
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

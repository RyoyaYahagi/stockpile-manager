import { NextRequest, NextResponse } from "next/server";

// LINE Webhookエンドポイント
// Webhook URLに https://your-app.vercel.app/api/line/webhook を設定
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log("=== LINE Webhook Event ===");
        console.log(JSON.stringify(body, null, 2));

        // イベントを処理
        for (const event of body.events || []) {
            const source = event.source;

            // グループからのイベント
            if (source?.type === "group") {
                console.log("╔════════════════════════════════════════╗");
                console.log("║   🎉 グループIDを検出しました！      ║");
                console.log("╠════════════════════════════════════════╣");
                console.log(`║ groupId: ${source.groupId}`);
                console.log("╚════════════════════════════════════════╝");
            }

            // 個人からのイベント
            if (source?.type === "user") {
                console.log(`📱 User ID: ${source.userId}`);
            }

            // イベントタイプをログ
            console.log(`📨 Event type: ${event.type}`);
        }

        // LINEプラットフォームには常に200を返す
        return NextResponse.json({ status: "ok" });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ status: "ok" });
    }
}

// LINE Developers ConsoleのWebhook検証用
export async function GET() {
    return NextResponse.json({ message: "LINE Webhook endpoint is ready" });
}

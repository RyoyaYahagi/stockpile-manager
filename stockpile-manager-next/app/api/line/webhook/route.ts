import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// LINE署名検証
function validateSignature(body: string, signature: string): boolean {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
        console.error("LINE_CHANNEL_SECRET not set");
        return false;
    }

    const hash = crypto
        .createHmac("sha256", channelSecret)
        .update(body)
        .digest("base64");

    try {
        return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
    } catch {
        return false;
    }
}

// IDをマスク（本番環境用）
function maskId(id: string): string {
    if (process.env.NODE_ENV === "production") {
        return id.length > 8 ? `${id.slice(0, 4)}****${id.slice(-4)}` : "****";
    }
    return id;
}

// LINE Webhookエンドポイント
export async function POST(request: NextRequest) {
    try {
        // 署名検証（本番環境では必須）
        const signature = request.headers.get("x-line-signature");
        const bodyText = await request.text();

        if (process.env.NODE_ENV === "production") {
            if (!signature || !validateSignature(bodyText, signature)) {
                console.error("LINE Webhook: Invalid signature");
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }
        }

        const body = JSON.parse(bodyText);

        // 開発環境のみ詳細ログ出力
        if (process.env.NODE_ENV !== "production") {
            console.log("=== LINE Webhook Event ===");
            console.log(JSON.stringify(body, null, 2));
        }

        // イベントを処理
        for (const event of body.events || []) {
            const source = event.source;

            // グループからのイベント
            if (source?.type === "group") {
                // 本番ではマスク、開発では全表示
                console.log(`LINE Webhook: Group event received, groupId: ${maskId(source.groupId)}`);
            }

            // 個人からのイベント
            if (source?.type === "user") {
                console.log(`LINE Webhook: User event received, userId: ${maskId(source.userId)}`);
            }
        }

        // LINEプラットフォームには常に200を返す
        return NextResponse.json({ status: "ok" });
    } catch (error) {
        // エラーログには機密情報を含めない
        console.error("LINE Webhook: Processing error", error instanceof Error ? error.message : "Unknown error");
        return NextResponse.json({ status: "ok" });
    }
}

// LINE Developers ConsoleのWebhook検証用
export async function GET() {
    return NextResponse.json({ message: "LINE Webhook endpoint is ready" });
}

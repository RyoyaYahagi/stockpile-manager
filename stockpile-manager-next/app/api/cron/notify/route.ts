import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { eq, and, lte, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

// LINE Messaging APIのエンドポイント
const LINE_PUSH_API = "https://api.line.me/v2/bot/message/push";
const LINE_MULTICAST_API = "https://api.line.me/v2/bot/message/multicast";

export async function GET(request: Request) {
    // Vercel Cronからのリクエストのみ許可（本番環境）
    if (process.env.VERCEL_ENV === 'production') {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        return NextResponse.json({ error: "LINE_CHANNEL_ACCESS_TOKEN not set" }, { status: 500 });
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 期限7日後
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 7);

        const targetItems = await db.query.items.findMany({
            where: and(
                lte(items.expiryDate, sevenDaysLater.toISOString().split('T')[0]),
                eq(items.notified7, false)
            ),
            with: {
                family: {
                    with: {
                        users: true
                    }
                },
                bag: true
            }
        });

        if (targetItems.length === 0) {
            return NextResponse.json({ message: "No items to notify" });
        }

        // 家族ごとにメッセージをまとめる
        const familyNotifications = new Map<string, {
            lineGroupId: string | null;
            userIds: string[];
            items: typeof targetItems;
        }>();

        for (const item of targetItems) {
            const family = item.family;
            if (!family) continue;

            const lineUserIds = family.users
                .map(u => u.lineUserId)
                .filter((id): id is string => !!id);

            if (!familyNotifications.has(family.id)) {
                familyNotifications.set(family.id, {
                    lineGroupId: family.lineGroupId,
                    userIds: lineUserIds,
                    items: []
                });
            }
            familyNotifications.get(family.id)!.items.push(item);
        }

        // LINE通知送信
        const results = [];
        for (const [familyId, data] of familyNotifications.entries()) {
            const message = createLineMessage(data.items);
            let success = false;

            // グループIDがあればグループに送信（Push API）
            if (data.lineGroupId) {
                const res = await fetch(LINE_PUSH_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
                    },
                    body: JSON.stringify({
                        to: data.lineGroupId,
                        messages: [
                            {
                                type: 'text',
                                text: message
                            }
                        ]
                    })
                });
                success = res.ok;
                if (!res.ok) {
                    console.error(`LINE Push API error: status ${res.status}`);
                }
            }
            // グループIDがなければ個人ユーザーに送信（Multicast API）
            else if (data.userIds.length > 0) {
                const uniqueUserIds = [...new Set(data.userIds)];
                const res = await fetch(LINE_MULTICAST_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
                    },
                    body: JSON.stringify({
                        to: uniqueUserIds,
                        messages: [
                            {
                                type: 'text',
                                text: message
                            }
                        ]
                    })
                });
                success = res.ok;
                if (!res.ok) {
                    console.error(`LINE Multicast API error: status ${res.status}`);
                }
            } else {
                // 送信先がない場合はスキップ
                continue;
            }

            if (success) {
                // 通知済みフラグを更新
                const itemIds = data.items.map(i => i.id);
                await db.update(items)
                    .set({ notified7: true })
                    .where(inArray(items.id, itemIds));

                results.push({ familyId, success: true, type: data.lineGroupId ? 'group' : 'individual' });
            } else {
                results.push({ familyId, success: false });
            }
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error("Cron job error:", error instanceof Error ? error.message : "Unknown error");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

interface NotificationItem {
    name: string;
    expiryDate: string | null;
    bag?: { name: string } | null;
}

function createLineMessage(items: NotificationItem[]): string {
    const lines = ["⚠️ 期限切れ間近の備蓄品があります"];

    for (const item of items) {
        const expiryStr = item.expiryDate
            ? new Date(item.expiryDate).toLocaleDateString()
            : "不明";
        lines.push(`・${item.name} (${expiryStr}) ${item.bag ? `[${item.bag.name}]` : ''}`);
    }

    lines.push("\n早めの消費・補充をお願いします！");
    return lines.join("\n");
}

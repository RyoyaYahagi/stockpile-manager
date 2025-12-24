import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { eq, and, lte, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

// LINE Messaging APIのエンドポイント
const LINE_PUSH_API = "https://api.line.me/v2/bot/message/push";
const LINE_MULTICAST_API = "https://api.line.me/v2/bot/message/multicast";

export async function GET(request: Request) {
    // Vercel Cronからのリクエストのみ許可（全環境で認証必須）
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET) {
        return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        return NextResponse.json({ error: "LINE_CHANNEL_ACCESS_TOKEN not set" }, { status: 500 });
    }

    try {
        // JST (UTC+9) で今日の日付を取得
        const jstOffset = 9 * 60 * 60 * 1000; // 9時間をミリ秒で
        const nowJST = new Date(Date.now() + jstOffset);
        const todayStr = nowJST.toISOString().split('T')[0]; // YYYY-MM-DD形式
        const today = new Date(todayStr);

        // 期限30日後（1ヶ月前通知）
        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(today.getDate() + 30);

        // 期限7日後
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 7);

        // 30日前通知対象
        const items30 = await db.query.items.findMany({
            where: and(
                lte(items.expiryDate, thirtyDaysLater.toISOString().split('T')[0]),
                eq(items.notified30, false)
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

        // 7日前通知対象
        const items7 = await db.query.items.findMany({
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

        // 通知対象を結合（重複除外）
        const allItemsMap = new Map<string, typeof items30[0] & { notifyType: '30' | '7' }>();
        for (const item of items30) {
            allItemsMap.set(item.id, { ...item, notifyType: '30' });
        }
        for (const item of items7) {
            if (!allItemsMap.has(item.id)) {
                allItemsMap.set(item.id, { ...item, notifyType: '7' });
            }
        }
        const targetItems = Array.from(allItemsMap.values());

        if (targetItems.length === 0) {
            return NextResponse.json({ message: "No items to notify" });
        }

        // 家族ごとにメッセージをまとめる
        const familyNotifications = new Map<string, {
            lineGroupId: string | null;
            userIds: string[];
            items30: typeof targetItems;
            items7: typeof targetItems;
        }>();

        for (const item of targetItems) {
            const family = item.family;
            if (!family) continue;

            const lineUserIds = family.users
                .map((u: { lineUserId: string | null }) => u.lineUserId)
                .filter((id: string | null): id is string => !!id);

            if (!familyNotifications.has(family.id)) {
                familyNotifications.set(family.id, {
                    lineGroupId: family.lineGroupId,
                    userIds: lineUserIds,
                    items30: [],
                    items7: []
                });
            }
            const data = familyNotifications.get(family.id)!;
            if (item.notifyType === '30') {
                data.items30.push(item);
            } else {
                data.items7.push(item);
            }
        }

        // LINE通知送信
        const results = [];
        for (const [familyId, data] of familyNotifications.entries()) {
            const allNotifyItems = [...data.items30, ...data.items7];
            const message = createLineMessage(allNotifyItems, data.items30.length > 0, data.items7.length > 0);
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
                // 通知済みフラグを更新（30日前と7日前を別々に）
                if (data.items30.length > 0) {
                    const itemIds30 = data.items30.map((i: { id: string }) => i.id);
                    await db.update(items)
                        .set({ notified30: true })
                        .where(inArray(items.id, itemIds30));
                }
                if (data.items7.length > 0) {
                    const itemIds7 = data.items7.map((i: { id: string }) => i.id);
                    await db.update(items)
                        .set({ notified7: true })
                        .where(inArray(items.id, itemIds7));
                }

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
    notifyType?: '30' | '7';
}

function createLineMessage(items: NotificationItem[], has30Days: boolean, has7Days: boolean): string {
    const lines: string[] = [];

    if (has30Days && has7Days) {
        lines.push("⚠️ 期限切れ間近の備蓄品があります");
    } else if (has30Days) {
        lines.push("📅 1ヶ月以内に期限が切れる備蓄品があります");
    } else {
        lines.push("⚠️ 1週間以内に期限が切れる備蓄品があります");
    }

    for (const item of items) {
        const expiryStr = item.expiryDate
            ? new Date(item.expiryDate).toLocaleDateString()
            : "不明";
        const typeLabel = item.notifyType === '30' ? '(1ヶ月前)' : '(7日前)';
        lines.push(`・${item.name} ${typeLabel} - ${expiryStr} ${item.bag ? `[${item.bag.name}]` : ''}`);
    }

    lines.push("\n早めの消費・補充をお願いします！");
    return lines.join("\n");
}

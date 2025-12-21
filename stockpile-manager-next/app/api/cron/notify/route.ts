import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { eq, and, lte, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

// LINE Messaging APIのエンドポイント
const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/multicast";

export async function GET() {
    console.log("Starting Cron Job: Notify");

    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        console.error("LINE_CHANNEL_ACCESS_TOKEN is missing");
        return NextResponse.json({ error: "LINE_CHANNEL_ACCESS_TOKEN not set" }, { status: 500 });
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 期限7日後
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 7);

        console.log(`Checking items expiring before or at: ${sevenDaysLater.toISOString()}`);

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

        console.log(`Found ${targetItems.length} target items`);

        if (targetItems.length === 0) {
            console.log("No items matched the criteria.");
            return NextResponse.json({ message: "No items to notify", logs: "No items matched" });
        }

        // 家族ごとにメッセージをまとめる
        const familyNotifications = new Map<string, { userIds: string[], items: typeof targetItems }>();

        for (const item of targetItems) {
            const family = item.family;
            if (!family) {
                console.log(`Item ${item.id} has no family linked.`);
                continue;
            }

            // LINE User IDを持っているユーザーを探す
            console.log(`Checking users in family ${family.id}:`, family.users);

            const lineUserIds = family.users
                .map(u => u.lineUserId)
                .filter((id): id is string => !!id);

            console.log(`  -> Found LINE IDs: ${lineUserIds}`);

            if (lineUserIds.length === 0) {
                console.log(`  -> Skipping family ${family.id} (No LINE IDs)`);
                continue;
            }

            if (!familyNotifications.has(family.id)) {
                familyNotifications.set(family.id, { userIds: lineUserIds, items: [] });
            }
            familyNotifications.get(family.id)!.items.push(item);
        }

        if (familyNotifications.size === 0) {
            console.log("No valid recipients found (missing LINE IDs).");
            return NextResponse.json({ message: "Items found but no valid recipients", count: targetItems.length });
        }

        // LINE通知送信
        const results = [];
        for (const [familyId, data] of familyNotifications.entries()) {
            const message = createLineMessage(data.items);
            const uniqueUserIds = [...new Set(data.userIds)];

            console.log(`Sending LINE message to family ${familyId} (Users: ${uniqueUserIds.join(', ')})`);

            const res = await fetch(LINE_MESSAGING_API, {
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

            if (res.ok) {
                console.log(`  -> Success`);
                // 通知済みフラグを更新
                const itemIds = data.items.map(i => i.id);
                await db.update(items)
                    .set({ notified7: true })
                    .where(inArray(items.id, itemIds));

                results.push({ familyId, success: true });
            } else {
                const errorText = await res.text();
                console.error(`  -> Failed: ${errorText}`);
                results.push({ familyId, success: false, error: errorText });
            }
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error("Cron job error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

function createLineMessage(items: any[]): string {
    const lines = ["⚠️ 期限切れ間近の備蓄品があります"];

    for (const item of items) {
        const expiry = new Date(item.expiryDate);
        lines.push(`・${item.name} (${expiry.toLocaleDateString()}) ${item.bag ? `[${item.bag.name}]` : ''}`);
    }

    lines.push("\n早めの消費・補充をお願いします！");
    return lines.join("\n");
}

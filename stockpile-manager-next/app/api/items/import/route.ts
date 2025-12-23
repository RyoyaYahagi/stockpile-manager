import { stackServerApp } from "@/lib/auth/stack";
import { db } from "@/lib/db";
import { items, users, bags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// インポートアイテムの型定義
interface ImportItem {
    name: string;
    quantity?: number;
    expiryDate: string;
    bagName?: string;
    locationNote?: string;
}

// バリデーション関数
function validateImportItems(data: unknown): { valid: boolean; items?: ImportItem[]; error?: string } {
    if (!Array.isArray(data)) {
        return { valid: false, error: "JSONは配列形式である必要があります" };
    }

    if (data.length === 0) {
        return { valid: false, error: "インポートするアイテムがありません" };
    }

    const validatedItems: ImportItem[] = [];

    for (let i = 0; i < data.length; i++) {
        const item = data[i];

        // nameの検証
        if (!item.name || typeof item.name !== "string" || item.name.trim() === "") {
            return { valid: false, error: `アイテム${i + 1}: 品名（name）は必須です` };
        }

        // expiryDateの検証
        if (!item.expiryDate || typeof item.expiryDate !== "string") {
            return { valid: false, error: `アイテム${i + 1}: 賞味期限（expiryDate）は必須です` };
        }

        // 日付形式の検証 (YYYY-MM-DD)
        const dateMatch = item.expiryDate.match(/^\d{4}-\d{2}-\d{2}$/);
        if (!dateMatch || isNaN(Date.parse(item.expiryDate))) {
            return { valid: false, error: `アイテム${i + 1}: 賞味期限はYYYY-MM-DD形式で指定してください` };
        }

        // quantityの検証（オプション）
        let quantity = 1;
        if (item.quantity !== undefined) {
            if (typeof item.quantity !== "number" || item.quantity < 1) {
                return { valid: false, error: `アイテム${i + 1}: 数量は1以上の数値で指定してください` };
            }
            quantity = Math.floor(item.quantity);
        }

        validatedItems.push({
            name: item.name.trim(),
            quantity,
            expiryDate: item.expiryDate,
            bagName: item.bagName?.trim() || undefined,
            locationNote: item.locationNote?.trim() || undefined,
        });
    }

    return { valid: true, items: validatedItems };
}

export async function POST(request: NextRequest) {
    const user = await stackServerApp.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
    });

    if (!dbUser?.familyId) {
        return NextResponse.json({ error: "No family" }, { status: 400 });
    }

    // リクエストボディのパース
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // バリデーション
    const validation = validateImportItems(body.items || body);
    if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const importItems = validation.items!;

    // 既存の袋を取得
    const existingBags = await db.query.bags.findMany({
        where: eq(bags.familyId, dbUser.familyId),
    });

    // 袋名→ID のマップを作成
    const bagNameToId = new Map<string, string>();
    existingBags.forEach((bag) => {
        bagNameToId.set(bag.name, bag.id);
    });

    // 新しく作成する袋名を収集
    const newBagNames = new Set<string>();
    importItems.forEach((item) => {
        if (item.bagName && !bagNameToId.has(item.bagName)) {
            newBagNames.add(item.bagName);
        }
    });

    // 新しい袋を作成
    for (const bagName of newBagNames) {
        const [newBag] = await db.insert(bags).values({
            familyId: dbUser.familyId,
            name: bagName,
        }).returning();
        bagNameToId.set(bagName, newBag.id);
    }

    const familyId = dbUser.familyId;

    // アイテムを一括登録
    const itemsToInsert = importItems.map((item) => ({
        familyId,
        name: item.name,
        quantity: item.quantity || 1,
        expiryDate: item.expiryDate,
        bagId: item.bagName ? bagNameToId.get(item.bagName) || null : null,
        locationNote: item.locationNote || null,
    }));

    const insertedItems = await db.insert(items).values(itemsToInsert).returning();

    // 登録結果を袋情報と共に返却
    const result = await Promise.all(
        insertedItems.map(async (item) => {
            const itemWithBag = await db.query.items.findFirst({
                where: eq(items.id, item.id),
                with: { bag: true },
            });
            return itemWithBag;
        })
    );

    return NextResponse.json({
        success: true,
        imported: result.length,
        items: result,
        newBags: Array.from(newBagNames),
    });
}

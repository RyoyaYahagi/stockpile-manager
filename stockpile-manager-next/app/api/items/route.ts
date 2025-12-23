import { stackServerApp } from "@/lib/auth/stack";
import { db } from "@/lib/db";
import { items, users, bags } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    const user = await stackServerApp.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
    });

    if (!dbUser?.familyId) {
        return NextResponse.json([]);
    }

    const result = await db.query.items.findMany({
        where: eq(items.familyId, dbUser.familyId),
        with: { bag: true },
        orderBy: (items, { asc }) => [asc(items.expiryDate)],
    });

    return NextResponse.json(result);
}

// 認証スキップ用モック削除

export async function POST(request: NextRequest) {
    try {
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
        const familyId = dbUser.familyId;

        const body = await request.json();
        console.log('[API] POST items body:', body); // デバッグログ

        const { name, quantity, expiryDate, bagId, locationNote } = body;

        // バリデーション
        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const [newItem] = await db.insert(items).values({
            familyId: familyId,
            name,
            quantity: quantity || 1,
            expiryDate: expiryDate || null, // 空文字対応
            bagId: bagId || null,
            locationNote: locationNote || null,
        }).returning();

        return NextResponse.json(newItem);
    } catch (error) {
        console.error('[API] POST items error:', error);
        return NextResponse.json({ error: "Internal Server Error", details: String(error) }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await db.delete(items).where(
        and(
            eq(items.id, id),
            eq(items.familyId, dbUser.familyId)
        )
    );

    return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest) {
    try {
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
        const familyId = dbUser.familyId;

        const body = await request.json();
        const { id, name, quantity, expiryDate, bagId, locationNote } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing id" }, { status: 400 });
        }

        const [updatedItem] = await db.update(items)
            .set({
                name,
                quantity: quantity || 1,
                expiryDate: expiryDate || null,
                bagId: bagId || null,
                locationNote: locationNote || null,
            })
            .where(
                and(
                    eq(items.id, id),
                    eq(items.familyId, familyId)
                )
            )
            .returning();

        // bag情報も含めて返す
        const itemWithBag = await db.query.items.findFirst({
            where: eq(items.id, id),
            with: { bag: true },
        });

        return NextResponse.json(itemWithBag);
    } catch (error) {
        console.error('[API] PUT items error:', error);
        return NextResponse.json({ error: "Internal Server Error", details: String(error) }, { status: 500 });
    }
}

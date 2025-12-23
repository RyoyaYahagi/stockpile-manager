import { stackServerApp } from "@/lib/auth/stack";
import { db } from "@/lib/db";
import { bags, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

    const result = await db.query.bags.findMany({
        where: eq(bags.familyId, dbUser.familyId),
        orderBy: (bags, { asc }) => [asc(bags.name)],
    });

    return NextResponse.json(result);
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

    const body = await request.json();
    const { name } = body;

    if (!name) {
        return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    const [newBag] = await db.insert(bags).values({
        familyId: dbUser.familyId,
        name,
    }).returning();

    return NextResponse.json(newBag);
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
    const bagId = searchParams.get("id");

    if (!bagId) {
        return NextResponse.json({ error: "Missing bag id" }, { status: 400 });
    }

    // 袋が自分の家族のものか確認
    const bag = await db.query.bags.findFirst({
        where: eq(bags.id, bagId),
    });

    if (!bag || bag.familyId !== dbUser.familyId) {
        return NextResponse.json({ error: "Bag not found" }, { status: 404 });
    }

    // 紐づくアイテムのbagIdをnullにクリア
    const { items } = await import("@/lib/db/schema");
    await db.update(items).set({ bagId: null }).where(eq(items.bagId, bagId));

    // 袋を削除
    await db.delete(bags).where(eq(bags.id, bagId));

    return NextResponse.json({ success: true });
}

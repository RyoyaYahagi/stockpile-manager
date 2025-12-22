import { stackServerApp } from "@/lib/auth/stack";
import { db } from "@/lib/db";
import { families, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// 家族を作成
export async function POST(request: NextRequest) {
    const user = await stackServerApp.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, action, inviteCode } = body;

    if (action === "create") {
        // 招待コードを生成
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        // 家族を作成
        const [newFamily] = await db.insert(families).values({
            name,
            inviteCode: code,
        }).returning();

        // ユーザーを家族に紐付け
        await db.update(users)
            .set({ familyId: newFamily.id })
            .where(eq(users.id, user.id));

        return NextResponse.json(newFamily);
    }

    if (action === "join") {
        // 招待コードで家族を検索
        const family = await db.query.families.findFirst({
            where: eq(families.inviteCode, inviteCode.toUpperCase()),
        });

        if (!family) {
            return NextResponse.json({ error: "Family not found" }, { status: 404 });
        }

        // ユーザーを家族に紐付け
        await db.update(users)
            .set({ familyId: family.id })
            .where(eq(users.id, user.id));

        return NextResponse.json(family);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

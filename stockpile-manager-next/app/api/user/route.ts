import { stackServerApp } from "@/lib/auth/stack";
import { db } from "@/lib/db";
import { users, families } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    const user = await stackServerApp.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DBからユーザー情報を取得
    const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        with: { family: true },
    });

    // ユーザーが存在しない場合は作成（競合時は無視）
    if (!dbUser) {
        await db.insert(users).values({
            id: user.id,
            displayName: user.displayName || null,
            email: user.primaryEmail || null,
        }).onConflictDoNothing();

        return NextResponse.json({
            id: user.id,
            familyId: null,
            familyName: null,
        });
    }

    return NextResponse.json({
        id: dbUser.id,
        familyId: dbUser.familyId,
        familyName: dbUser.family?.name || null,
        displayName: dbUser.displayName,
        lineUserId: dbUser.lineUserId,
    });
}

export async function PUT(request: Request) {
    const user = await stackServerApp.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { lineUserId } = body;

        // lineUserIdが空文字列ならnullにするなど、バリデーション
        const newLineUserId = lineUserId ? lineUserId.trim() : null;

        await db.update(users)
            .set({ lineUserId: newLineUserId })
            .where(eq(users.id, user.id));

        return NextResponse.json({ success: true, lineUserId: newLineUserId });
    } catch (error) {
        console.error("Update user error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

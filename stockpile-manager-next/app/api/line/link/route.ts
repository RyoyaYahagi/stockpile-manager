import { stackServerApp } from "@/lib/auth/stack";
import { db } from "@/lib/db";
import { lineLinkTokens, users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = 'edge';

// 6桁のランダムコードを生成
function generateLinkCode(): string {
    const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 紛らわしい文字(I, O)を除外
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// POST: 新しいリンクトークンを生成
export async function POST() {
    const user = await stackServerApp.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // ユーザーがDBに存在するか確認、なければ作成
        const existingUser = await db.query.users.findFirst({
            where: eq(users.id, user.id),
        });

        if (!existingUser) {
            await db.insert(users).values({
                id: user.id,
                displayName: user.displayName || null,
                email: user.primaryEmail || null,
            }).onConflictDoNothing();
        }

        // 既存の未使用トークンを無効化（ユーザーごとに1つだけ有効なトークンを保持）
        await db.delete(lineLinkTokens)
            .where(and(
                eq(lineLinkTokens.userId, user.id),
                eq(lineLinkTokens.used, false)
            ));

        // 新しいトークンを生成
        const token = generateLinkCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分間有効

        const [newToken] = await db.insert(lineLinkTokens)
            .values({
                userId: user.id,
                token,
                expiresAt,
            })
            .returning();

        return NextResponse.json({
            token: newToken.token,
            expiresAt: newToken.expiresAt,
        });
    } catch (error) {
        console.error("Generate link token error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// GET: 連携状態を確認（ポーリング用）
export async function GET() {
    const user = await stackServerApp.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // ユーザーのLINE User IDを取得
        const dbUser = await db.query.users.findFirst({
            where: eq(users.id, user.id),
        });

        if (dbUser?.lineUserId) {
            return NextResponse.json({
                linked: true,
                lineUserId: dbUser.lineUserId,
            });
        }

        // 有効なトークンがあるかチェック
        const activeToken = await db.query.lineLinkTokens.findFirst({
            where: and(
                eq(lineLinkTokens.userId, user.id),
                eq(lineLinkTokens.used, false),
                gt(lineLinkTokens.expiresAt, new Date())
            ),
        });

        return NextResponse.json({
            linked: false,
            hasActiveToken: !!activeToken,
            expiresAt: activeToken?.expiresAt || null,
        });
    } catch (error) {
        console.error("Check link status error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

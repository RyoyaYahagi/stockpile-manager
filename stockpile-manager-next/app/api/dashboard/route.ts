import { stackServerApp } from "@/lib/auth/stack";
import { db } from "@/lib/db";
import { users, items, bags, families } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = 'edge';

/**
 * ダッシュボード用統合API
 * 1回のリクエストで全データを取得（コールドスタート対策）
 */
export async function GET() {
    const user = await stackServerApp.getUser();

    // 認証スキップが有効な場合はモックデータを返す
    if (process.env.NEXT_PUBLIC_SKIP_AUTH === 'true') {
        return NextResponse.json({
            user: {
                id: 'test-user-id',
                familyId: 'test-family-id',
                familyName: 'テスト家族',
                displayName: 'テストユーザー',
                lineUserId: null,
            },
            items: [],
            bags: [],
            family: {
                inviteCode: 'TEST01',
                familyName: 'テスト家族',
                lineGroupId: null,
                members: [],
            },
        });
    }

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DBからユーザー情報を取得
    const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        with: { family: true },
    });

    // ユーザーが存在しない場合は作成
    if (!dbUser) {
        await db.insert(users).values({
            id: user.id,
            displayName: user.displayName || null,
            email: user.primaryEmail || null,
        }).onConflictDoNothing();

        return NextResponse.json({
            user: {
                id: user.id,
                familyId: null,
                familyName: null,
            },
            items: [],
            bags: [],
            family: null,
        });
    }

    // familyIdがない場合は早期リターン
    if (!dbUser.familyId) {
        return NextResponse.json({
            user: {
                id: dbUser.id,
                familyId: null,
                familyName: null,
                displayName: dbUser.displayName,
                lineUserId: dbUser.lineUserId,
            },
            items: [],
            bags: [],
            family: null,
        });
    }

    // 全データを並列で取得
    const [itemsData, bagsData, familyData, membersData] = await Promise.all([
        db.query.items.findMany({
            where: eq(items.familyId, dbUser.familyId),
            with: { bag: true },
            orderBy: (items, { asc }) => [asc(items.expiryDate)],
        }),
        db.query.bags.findMany({
            where: eq(bags.familyId, dbUser.familyId),
            orderBy: (bags, { asc }) => [asc(bags.name)],
        }),
        db.query.families.findFirst({
            where: eq(families.id, dbUser.familyId),
        }),
        db.query.users.findMany({
            where: eq(users.familyId, dbUser.familyId),
        }),
    ]);

    return NextResponse.json({
        user: {
            id: dbUser.id,
            familyId: dbUser.familyId,
            familyName: dbUser.family?.name || null,
            displayName: dbUser.displayName,
            lineUserId: dbUser.lineUserId,
        },
        items: itemsData,
        bags: bagsData,
        family: familyData ? {
            inviteCode: familyData.inviteCode,
            familyName: familyData.name,
            lineGroupId: familyData.lineGroupId,
            members: membersData.map(m => ({
                id: m.id,
                displayName: m.displayName || m.email || "名前未設定",
                email: m.email,
            })),
        } : null,
    });
}

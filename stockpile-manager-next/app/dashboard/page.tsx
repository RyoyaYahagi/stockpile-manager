"use client";

import { useUser } from "@stackframe/stack";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import ItemList from "@/components/ItemList";
import Header from "@/components/Header";
import LineSettingsModal from "@/components/LineSettingsModal";
import FamilyInviteModal from "@/components/FamilyInviteModal";
import type { Item, Bag } from "@/lib/db/schema";

// テスト用設定削除
const SKIP_AUTH = false;

export default function Dashboard() {
    const user = useUser();
    const router = useRouter();
    const [items, setItems] = useState<(Item & { bag: Bag | null })[]>([]);
    const [bags, setBags] = useState<Bag[]>([]);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const [familyName, setFamilyName] = useState("家族");
    const [isLoading, setIsLoading] = useState(true);
    // LINE設定追加
    const [lineUserId, setLineUserId] = useState<string | null>(null);
    const [lineGroupId, setLineGroupId] = useState<string | null>(null);
    const [isLineModalOpen, setIsLineModalOpen] = useState(false);
    const [isFamilyInviteModalOpen, setIsFamilyInviteModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            // 統合APIで全データを1回で取得（コールドスタート対策）
            const res = await fetch("/api/dashboard");
            const data = await res.json();

            if (data.error) {
                console.error("Dashboard API error:", data.error);
                return;
            }

            if (!data.user?.familyId) {
                router.push("/family/setup");
                return;
            }

            setFamilyId(data.user.familyId);
            setFamilyName(data.user.familyName || "家族");
            setLineUserId(data.user.lineUserId);
            setItems(data.items || []);
            setBags(data.bags || []);
            if (data.family?.lineGroupId) {
                setLineGroupId(data.family.lineGroupId);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        // 認証スキップモードの場合はリダイレクトしない
        if (!SKIP_AUTH && !user) {
            router.push("/login");
            return;
        }

        fetchData();
    }, [user, router, fetchData]);

    const handleAddItem = (newItem: Item & { bag: Bag | null }) => {
        setItems((prev) => [...prev, newItem].sort((a, b) =>
            new Date(a.expiryDate || "").getTime() - new Date(b.expiryDate || "").getTime()
        ));
    };

    const handleRemoveItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleUpdateItem = (updatedItem: Item & { bag: Bag | null }) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === updatedItem.id ? updatedItem : item
            ).sort((a, b) =>
                new Date(a.expiryDate || "").getTime() - new Date(b.expiryDate || "").getTime()
            )
        );
    };

    const handleAddBag = (newBag: Bag) => {
        setBags((prev) => [...prev, newBag].sort((a, b) => a.name.localeCompare(b.name)));
    };

    const handleRemoveBag = (bagId: string) => {
        setBags((prev) => prev.filter((bag) => bag.id !== bagId));
        // 削除された袋に紐づくアイテムのbag情報をnullに更新
        setItems((prev) =>
            prev.map((item) =>
                item.bagId === bagId ? { ...item, bagId: null, bag: null } : item
            )
        );
    };

    if ((!SKIP_AUTH && !user) || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // 認証スキップ時のモック表示名
    const displayName = SKIP_AUTH
        ? 'テストユーザー'
        : (user?.displayName || user?.primaryEmail || 'ユーザー');

    return (
        <div className="min-h-screen bg-gray-50">
            <Header
                displayName={displayName}
                familyName={familyName}
            />
            <main className="max-w-2xl mx-auto px-4 py-6">
                <div className="flex justify-end gap-2 mb-4">
                    <button
                        onClick={() => setIsFamilyInviteModalOpen(true)}
                        className="text-sm px-3 py-1 rounded border flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    >
                        <span>👨‍👩‍👧‍👦</span>
                        家族を招待
                    </button>
                    <button
                        onClick={() => setIsLineModalOpen(true)}
                        className={`text-sm px-3 py-1 rounded border flex items-center gap-1 ${(lineUserId || lineGroupId) ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}`}
                    >
                        <span>💬</span>
                        {(lineUserId || lineGroupId) ? "LINE連携設定" : "LINE未連携"}
                    </button>
                </div>

                {familyId && (
                    <ItemList
                        items={items}
                        bags={bags}
                        familyId={familyId}
                        onAddItem={handleAddItem}
                        onRemoveItem={handleRemoveItem}
                        onUpdateItem={handleUpdateItem}
                        onAddBag={handleAddBag}
                        onRemoveBag={handleRemoveBag}
                    />
                )}

                {isLineModalOpen && (
                    <LineSettingsModal
                        currentLineUserId={lineUserId}
                        currentLineGroupId={lineGroupId}
                        onClose={() => setIsLineModalOpen(false)}
                        onSave={(userId, groupId) => {
                            setLineUserId(userId);
                            setLineGroupId(groupId);
                        }}
                    />
                )}

                {isFamilyInviteModalOpen && (
                    <FamilyInviteModal
                        onClose={() => setIsFamilyInviteModalOpen(false)}
                    />
                )}

                {isFamilyInviteModalOpen && (
                    <FamilyInviteModal
                        onClose={() => setIsFamilyInviteModalOpen(false)}
                    />
                )}
            </main>
        </div>
    );
}

"use client";

import { useUser } from "@stackframe/stack";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import ItemList from "@/components/ItemList";
import Header from "@/components/Header";
import LineSettingsModal from "@/components/LineSettingsModal";
import type { Item, Bag } from "@/lib/db/schema";

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
    const [isLineModalOpen, setIsLineModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            // ユーザーデータを取得
            const userRes = await fetch("/api/user");
            const userData = await userRes.json();

            if (!userData.familyId) {
                router.push("/family/setup");
                return;
            }

            setFamilyId(userData.familyId);
            setFamilyName(userData.familyName || "家族");
            setLineUserId(userData.lineUserId);

            // 備蓄品と袋を取得
            const [itemsRes, bagsRes] = await Promise.all([
                fetch("/api/items"),
                fetch("/api/bags"),
            ]);

            const itemsData = await itemsRes.json();
            const bagsData = await bagsRes.json();

            setItems(itemsData);
            setBags(bagsData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }

        fetchData();
    }, [user, router, fetchData]);

    const handleAddItem = (newItem: Item & { bag: Bag | null }) => {
        setItems((prev) => [...prev, newItem].sort((a, b) =>
            new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
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
                new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
            )
        );
    };

    if (!user || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header
                displayName={user.displayName || user.primaryEmail || "ユーザー"}
                familyName={familyName}
            />
            <main className="max-w-2xl mx-auto px-4 py-6">
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => setIsLineModalOpen(true)}
                        className={`text-sm px-3 py-1 rounded border flex items-center gap-1 ${lineUserId ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                    >
                        <span>💬</span>
                        {lineUserId ? "LINE連携設定" : "LINE未連携"}
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
                    />
                )}

                {isLineModalOpen && (
                    <LineSettingsModal
                        currentLineUserId={lineUserId}
                        onClose={() => setIsLineModalOpen(false)}
                        onSave={(id) => setLineUserId(id)}
                    />
                )}
            </main>
        </div>
    );
}
